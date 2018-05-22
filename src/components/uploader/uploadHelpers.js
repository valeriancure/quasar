const createWithUrl = ({task, additionalFields, updateProgressBytes, success, failure, url, xhrMethod, xhrHeaders, xhrRawFile}) => {
  const { file } = task
  const form = new FormData()
  const xhr = new XMLHttpRequest()
  if (additionalFields) {
    try {
      additionalFields.forEach(field => {
        form.append(field.name, field.value)
      })
    }
    catch (e) { return } // TODO ???
  }
  try {
    form.append('Content-Type', file.type || 'application/octet-stream')
    form.append(task.filename, file)
  }
  catch (e) { return } // TODO ???

  xhr.upload.addEventListener('progress', e => {
    updateProgressBytes(e.loaded, e.total)
  }, false)
  xhr.onreadystatechange = () => {
    if (xhr.readyState < 4) return
    if (xhr.status && xhr.status < 400) success()
    else failure()
  }
  xhr.onerror = () => { failure() }

  const start = () => {
    const urlPromise = (typeof url === 'function') // url can be an 'urlFactory' returning a Promise
      ? url(file, task) // trying to keep compatibility with previous syntax urlFactory(file)
      : Promise.resolve(url)
    return urlPromise.then(url => {
      xhr.open(xhrMethod, url, true)
      if (xhrHeaders) {
        Object.keys(xhrHeaders).forEach(key => {
          xhr.setRequestHeader(key, xhrHeaders[key])
        })
      }
      xhr.send(xhrRawFile ? file : form)
      const abort = () => { xhr.abort() } // can't assign abort = xhr.abort (TypeError: Illegal invocation)
      return Promise.resolve({ abort })
    })
  }
  return start
}

const checkConfigWithUrl = ({ vm }) => {
  let err
  if (!vm.url && !vm.urlFactory) {
    err = `the 'url' upload-helper needs at least one of these props : url/urlFactory`
  }
  return { err }
}

const createWithFirebaseStorage = ({task, additionalFields, updateProgressBytes, success, failure, ref, refFactory}) => {
  const { file } = task
  // Firebase Storage allows custom String props to be written in metadata.customMdetadata
  const metadata = {
    customMetadata: {}
  }
  // We reuse the additionalFields prop to populate metadata
  additionalFields.forEach(field => {
    metadata.customMetadata[field.name] = field.value
  })

  let getRefPromise

  // simplest usage : provide a Firebase Storage Ref
  if (typeof ref === 'object') {
    getRefPromise = () => {
      return new Promise((resolve, reject) => {
        resolve(ref.child(task.filename)) // .put(file, metadata)
      })
    }
  }
  /* alternative : provide a synchronous function that returns a Firebase Storage Ref
    i.e. if the files need to be renamed before upload */
  else if (typeof ref === 'function') {
    getRefPromise = () => {
      return new Promise((resolve, reject) => {
        resolve(ref(task))
      })
    }
  }
  /* alternative : provide a function that returns a Promise who resolves to a Firebase Storage Ref
    i.e. if the files need to be renamed before upload */
  if (typeof refFactory === 'function') {
    getRefPromise = refFactory(task)
  }
  const start = () => {
    return getRefPromise().then(ref => {
      const uploadTask = ref.put(file, metadata)
      uploadTask.on('state_changed', snapshot => {
        // upload in progresss
        updateProgressBytes(snapshot.bytesTransferred, snapshot.totalBytes)
      }, error => {
        // error while uploading
        failure(error)
      }, () => {
        // upload successful
        success()
      })
      return Promise.resolve({
        abort: () => { uploadTask.cancel() },
        pause: () => { uploadTask.pause() }, // pause/resume not used by current QUploader
        resume: () => { uploadTask.resume() } // but might be used in Hooks
      })
    })
  }
  return start
}

const checkConfigWithFirebaseStorage = ({ vm }) => {
  let err
  const { ref, refFactory } = vm.custom
  if (!ref && !refFactory) {
    err = `the 'firebase-storage' upload-helper needs custom.ref (Firebase Storage Ref, or function returning a Ref) OR custom.refFactory (function returning a promise resolving to a Ref) to be provided.`
  }
  else if (ref && refFactory) {
    err = `the 'firebase-storage' upload-helper needs custom.ref OR custom.refFactory, but NOT both.`
  }
  else if (ref && (typeof ref !== 'object') && (typeof ref !== 'function')) {
    err = `the 'firebase-storage' upload-helper needs custom.ref to be a Firebase Storage Ref, or a function returning a Ref.`
  }
  else if (refFactory && (typeof refFactory !== 'function')) {
    err = `the 'firebase-storage' upload-helper needs custom.refFactory to be a function (returning a promise resolving to a Ref).`
  }
  return { err }
}

export default {
  url: {
    helperName: 'url',
    create: createWithUrl,
    specificArguments: {
      url: 'url',
      urlFactory: 'urlFactory',
      xhrMethod: 'method',
      xhrHeaders: 'headers',
      xhrRawFile: 'sendRaw'
    },
    checker: checkConfigWithUrl
  },
  'firebase-storage': {
    helperName: 'firebase-storage',
    create: createWithFirebaseStorage,
    specificArguments: {
      ref: vm => vm.custom.ref,
      refFactory: vm => vm.custom.refFactory
    },
    checker: checkConfigWithFirebaseStorage
  }
}
