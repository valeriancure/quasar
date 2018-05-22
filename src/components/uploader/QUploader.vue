<template>
  <div
    class="q-uploader relative-position"
    :class="classes"
    @dragover.prevent.stop="__onDragOver"
  >
    <q-input-frame
      ref="input"

      :prefix="prefix"
      :suffix="suffix"
      :stack-label="stackLabel"
      :float-label="floatLabel"
      :error="error"
      :warning="warning"
      :disable="disable"
      :inverted="inverted"
      :invertedLight="invertedLight"
      :dark="dark"
      :hide-underline="hideUnderline"
      :before="before"
      :after="after"
      :color="color"
      :align="align"
      :no-parent-field="noParentField"

      :length="queuedOrFailedTasks.length"
      additional-length
    >
      <div
        class="col q-input-target ellipsis"
        :class="alignClass"
      >
        {{ label }}
      </div>

      <q-spinner
        v-if="uploadingTasks.length"
        slot="after"
        size="24px"
        class="q-if-end self-center"
      ></q-spinner>

      <q-icon
        v-if="uploadingTasks.length"
        slot="after"
        class="q-if-end self-center"
        :name="$q.icon.uploader[`clear${isInverted ? 'Inverted' : ''}`]"
        @click.native="abort"
      ></q-icon>

      <q-icon
        v-if="!uploadingTasks.length"
        slot="after"
        :name="$q.icon.uploader.add"
        class="q-uploader-pick-button q-if-control relative-position overflow-hidden"
        @click.native="__pick"
        :disabled="addDisabled"
      >
        <input
          type="file"
          ref="file"
          class="q-uploader-input absolute-full cursor-pointer"
          :accept="extensions"
          v-bind.prop="{multiple: multiple}"
          @change="__handleFileInputChange"
        >
      </q-icon>

      <q-icon
        v-if="!hideUploadButton && queuedOrFailedTasks.length"
        slot="after"
        :name="$q.icon.uploader.upload"
        class="q-if-control"
        :disabled="queuedOrFailedTasks.length === 0"
        @click.native="upload"
      ></q-icon>

      <q-icon
        v-if="hasExpandedContent"
        slot="after"
        :name="$q.icon.uploader.expand"
        class="q-if-control generic_transition"
        :class="{'rotate-180': expanded}"
        @click.native="expanded = !expanded"
      ></q-icon>
    </q-input-frame>

    <q-slide-transition>
      <div v-show="expanded" :class="expandClass" :style="expandStyle">
        <q-list :dark="dark" class="q-uploader-files q-py-none scroll" :style="filesStyle">
          <q-item
            v-for="task in tasks"
            :key="task.uid"
            class="q-uploader-file q-pa-xs"
          >
            <q-progress v-if="!hideUploadProgress"
              class="q-uploader-progress-bg absolute-full"
              :color="task.failed ? 'negative' : progressColor"
              :percentage="task.progressPercent"
              height="100%"
            ></q-progress>
            <div class="q-uploader-progress-text absolute" v-if="!hideUploadProgress">
              {{ task.progressPercent }}%
            </div>

            <q-item-side v-if="task.isImage && task.imgSrc" :image="task.imgSrc"></q-item-side>
            <q-item-side v-else :icon="$q.icon.uploader.file" :color="color"></q-item-side>

            <q-item-main :label="task.file.name" :sublabel="task.humanSize"></q-item-main>

            <q-item-side right>
              <q-item-tile
                :icon="$q.icon.uploader[task.uploaded ? 'done' : 'clear']"
                :color="color"
                class="cursor-pointer"
                @click.native="__remove(task)"
              ></q-item-tile>
            </q-item-side>
          </q-item>
        </q-list>
      </div>
    </q-slide-transition>

    <div
      v-if="dnd"
      class="q-uploader-dnd flex row items-center justify-center absolute-full"
      :class="dndClass"
      @dragenter.prevent.stop
      @dragover.prevent.stop
      @dragleave.prevent.stop="__onDragLeave"
      @drop.prevent.stop="__onDrop"
    ></div>
  </div>
</template>

<script>
import { QInputFrame } from '../input-frame'
import FrameMixin from '../../mixins/input-frame'
import { humanStorageSize } from '../../utils/format'
import { QSpinner } from '../spinner'
import { QIcon } from '../icon'
import { QProgress } from '../progress'
import { QItem, QItemSide, QItemMain, QItemTile, QList } from '../list'
import { QSlideTransition } from '../slide-transition'
import uid from '../../utils/uid'
import uploadHelpers from './uploadHelpers'

function initFile (file) {
  file.__doneUploading = false
  file.__failed = false
  file.__uploadedBytes = 0
  file.__progress = 0
}

export default {
  name: 'QUploader',
  mixins: [FrameMixin],
  components: {
    QInputFrame,
    QSpinner,
    QIcon,
    QProgress,
    QList,
    QItem,
    QItemSide,
    QItemMain,
    QItemTile,
    QSlideTransition
  },
  props: {
    name: {
      type: String,
      default: 'file'
    },
    headers: Object,
    url: {
      type: String,
      required: false
    },
    urlFactory: {
      type: Function,
      required: false
    },
    custom: {
      type: Object,
      required: false
    },
    additionalFields: {
      type: Array,
      default: () => []
    },
    method: {
      type: String,
      default: 'POST'
    },
    extensions: String,
    multiple: Boolean,
    parallelUploads: { // how many upload task to run simultaneously
      type: Number,
      required: false
    },
    autoStart: Boolean, // upload starts as soon as a file is ready
    hideUploadButton: Boolean,
    hideUploadProgress: Boolean,
    noThumbnails: Boolean,
    autoExpand: Boolean,
    expandStyle: [Array, String, Object],
    expandClass: [Array, String, Object],
    sendRaw: {
      type: Boolean,
      default: false
    },
    handleNewFile: {
      type: Function,
      required: false
    }
  },
  data () {
    return {
      tasks: [],
      canStartUploads: false,
      focused: false,
      dnd: false,
      expanded: false
    }
  },
  computed: {
    uploadHelper () {
      let uploadHelper
      if (this.custom && this.custom.uploadHelper) { // we won't use the default 'url' (xhr) method
        if (typeof this.custom.uploadHelper === 'string') { // upload with a predefined upload helper
          if (uploadHelpers[this.custom.uploadHelper]) { // We check the helper exists
            uploadHelper = uploadHelpers[this.custom.uploadHelper]
          }
          else { // helper not found
            console.error(`Upload helper ${this.custom.uploadHelper} not found. Try null, 'url' or 'firebase-storage'.`)
          }
        }
        else if (typeof this.custom.uploadHelper === 'object') {
          uploadHelper = { create: this.custom.uploadHelper }
        }
        else {
          console.error(`custom.uploadHelper should be null, or a Object {create()}, or a String ('url' or 'firebase-storage'). Got a ${typeof this.custom.uploadHelper}`)
        }
      }
      else { // default upload method, supposed to be compatible with previous versions of QUploader
        uploadHelper = uploadHelpers['url']
      }
      if (uploadHelper.checker) { // helpers come with a 'checker' functions that will check the vm/custom prop
        const check = uploadHelper.checker({ vm: this })
        if (check.err) console.error(check.err)
      }
      return uploadHelper
    },
    uploadingTasks () {
      return this.tasks.filter(task => task.uploading)
    },
    acceptedTasks () {
      return this.tasks.filter(task => task.accepted)
    },
    queuedTasks () {
      return this.tasks.filter(task => task.accepted && !task.uploading && !task.uploaded && !task.failed)
    },
    failedTasks () {
      return this.tasks.filter(task => task.failed)
    },
    queuedOrFailedTasks () {
      return [...this.queuedTasks, ...this.failedTasks]
    },
    queuedOrUploadingTasks () {
      return [...this.queuedTasks, ...this.uploadingTasks]
    },
    shouldStartUploads () {
      return this.canStartUploads || this.autoStart
    },
    hasExpandedContent () {
      return this.tasks.length > 0
    },
    totalSizeBytes () {
      return this.acceptedTasks.reduce((total, task) => total + task.file.size, 0)
    },
    totalProgressBytes () {
      return this.acceptedTasks.reduce((total, task) => total + task.progressBytes, 0)
    },
    totalProgressPercent () {
      return this.totalSizeBytes ? Math.min(100, this.totalProgressBytes / this.totalSizeBytes * 100) : 0
    },
    label () {
      const total = humanStorageSize(this.totalSizeBytes)
      return this.uploadingTasks.length
        ? `${(this.totalProgressPercent).toFixed(2)}% (${humanStorageSize(this.totalProgressBytes)} / ${total})`
        : `${this.acceptedTasks.length} (${total})`
    },
    addDisabled () {
      return !this.multiple && this.queueLength >= 1
    },
    filesStyle () {
      if (this.maxHeight) {
        return { maxHeight: this.maxHeight }
      }
    },
    dndClass () {
      const cls = [`text-${this.color}`]
      if (this.isInverted) {
        cls.push('inverted')
      }
      return cls
    },
    classes () {
      return {
        'q-uploader-expanded': this.expanded,
        'q-uploader-dark': this.dark,
        'q-uploader-files-no-border': this.isInverted || !this.hideUnderline
      }
    },
    progressColor () {
      return this.dark ? 'white' : 'grey'
    },
    computedExtensions () {
      if (this.extensions) {
        return this.extensions.split(',').map(ext => {
          ext = ext.trim()
          // support "image/*"
          if (ext.endsWith('/*')) {
            ext = ext.slice(0, ext.length - 1)
          }
          return ext
        })
      }
    }
  },
  watch: {
    hasExpandedContent (v) {
      if (v === false) {
        this.expanded = false
      }
      else if (this.autoExpand) {
        this.expanded = true
      }
    },
    shouldStartUploads () {
      console.log('watcher shouldStartUploads', Date.now())
      if (this.shouldStartUploads) {
        this.__processQueue()
      }
    },
    uploadingTasks () {
      console.log('watcher uploadingTasks', Date.now())
      this.__processQueue()
    }
  },
  methods: {
    __handleNewFileList (fileList) {
      const filesArray = Array.prototype.slice.call(fileList) // Convert FileList to regular Array
      filesArray.forEach(this.__handleNewFile) // process each file one-by-one
    },
    __handleFileInputChange (e) {
      this.__handleNewFileList(e.target.files)
      this.$refs.file.value = '' // remove all files from the <Input />
    },
    add (files, strict) { // method called from outside
      const filesArray = this.__convertToFilesArray(files)
      if (strict) { // caller wants to enforce all the checking process
        filesArray.forEach(this.__handleNewFile)
      }
      else { // caller wants to force-add files
        filesArray.forEach(this.__acceptFile)
      }
    },
    __handleNewFile (file) {
      if (this.addDisabled) return // disabled by prop
      if (this.tasks.some(task => task.file.name === file.name && task.file.size === file.size)) return // file already added
      if (!this.multiple && this.tasks.length) return // only one file allowed ; we should replace it // TODO
      // we wrap file in an object so we can avoid mutating its own properties.
      const task = {
        file,
        uid: uid(),
        filename: file.name, // might be mutated later
        humanSize: humanStorageSize(file.size),
        isImage: this.__isImage(file),
        imgSrc: null,
        accepted: false,
        rejected: false,
        uploading: false,
        progressBytes: 0,
        progressPercent: 0,
        uploaded: false,
        failed: false,
        uploader: null
      }
      if (task.isImage) {
        this.__readFileAsDataURLPromise(file).then(src => { // async, but the view is reactive to the imgSrc property, so OK
          task.imgSrc = src
        })
      }
      this.__handleNewTask(task)
    },
    __handleNewTask (task) {
      task.accepted = true
      this.__addUploaderToTask(task)
    },
    __addUploaderToTask (task) {
      const uploaderArguments = { // common arguments passed to all upload helpers
        task,
        additionalFields: this.additionalFields,
        updateProgressBytes: progress => { this.__updateProgressBytes({task, progress}) },
        success: () => { this.__completeTask(task) },
        failure: err => { this.__failTask(task, err) }
      }
      const helperArguments = this.uploadHelper.specificArguments // specific arguments required by the helper
      if (typeof helperArguments === 'object') {
        Object.keys(helperArguments).forEach(key => {
          const val = helperArguments[key]
          if (typeof val === 'string') uploaderArguments[key] = this[val]
          if (typeof val === 'function') uploaderArguments[key] = val(this)
        })
      }
      task.uploader = {
        start: this.uploadHelper.create(uploaderArguments)
      }
      this.tasks.push(task)
    },
    __startUpload (task) {
      task.uploading = true
      task.uploader.start().then(methods => {
        task.uploader.abort = methods.abort
        task.uploader.pause = methods.pause //    assigned one by one so you're aware these
        task.uploader.resume = methods.resume //  methods may exist. They can be used in Hooks
      })
    },
    __updateProgressBytes ({task, progress, total}) {
      let totalBytes = total || task.file.size
      task.progressBytes = progress
      const progressPercentRaw = totalBytes ? progress / totalBytes : 0
      task.progressPercent = Math.min(100, parseInt(progressPercentRaw * 100, 10))
    },
    __completeTask (task) {
      task.uploaded = true
      task.uploading = false
    },
    __failTask (task, err) {
      task.uploading = false
      task.failed = true
    },
    __abortUpload (task) {
      task.uploading = false
      task.uploader.abort()
    },
    __processQueue () {
      if (!this.shouldStartUploads) return
      const queued = this.queuedTasks
      const uploading = this.uploadingTasks
      if (!queued.length) return // TODO : add failed tasks ?
      if (this.parallelUploads && uploading.length >= this.parallelUploads) return // max parallel uploads reched
      const nextTask = queued[0]
      this.__startUpload(nextTask)
    },
    __onDragOver () {
      this.dnd = true
    },
    __onDragLeave () {
      this.dnd = false
    },
    __onDrop (e) {
      this.dnd = false
      this.__handleNewFileList(e.dataTransfer.files)
    },
    __filter (files) {
      return Array.prototype.filter.call(files, file => {
        return this.computedExtensions.some(ext => {
          return file.type.toUpperCase().startsWith(ext.toUpperCase()) ||
            file.name.toUpperCase().endsWith(ext.toUpperCase())
        })
      })
    },
    __add (e, files) {
    },
    __remove (task) {
      if (task.uploading) {
        this.__abortUpload(task)
        this.$emit('remove:abort', task.file, task.file.xhr)
      }
      else {
        this.$emit(`remove:${task.uploaded ? 'done' : 'cancel'}`, task.file, task.file.xhr)
        this.tasks = this.tasks.filter(t => t.uid !== task.uid)
      }
    },
    __pick () {
      if (!this.addDisabled && this.$q.platform.is.mozilla) {
        this.$refs.file.click()
      }
    },
    __getUploadPromise (file) {
      const
        form = new FormData(),
        xhr = new XMLHttpRequest()

      try {
        this.additionalFields.forEach(field => {
          form.append(field.name, field.value)
        })
        form.append('Content-Type', file.type || 'application/octet-stream')
        form.append(this.name, file)
      }
      catch (e) {
        return
      }

      initFile(file)
      file.xhr = xhr
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', e => {
          if (file.__removed) { return }
          e.percent = e.total ? e.loaded / e.total : 0
          let uploaded = e.percent * file.size
          this.uploadedSize += uploaded - file.__uploaded
          file.__uploaded = uploaded
          file.__progress = Math.min(99, parseInt(e.percent * 100, 10))
        }, false)

        xhr.onreadystatechange = () => {
          if (xhr.readyState < 4) {
            return
          }
          if (xhr.status && xhr.status < 400) {
            file.__doneUploading = true
            file.__progress = 100
            this.$emit('uploaded', file, xhr)
            resolve(file)
          }
          else {
            file.__failed = true
            this.$emit('fail', file, xhr)
            reject(xhr)
          }
        }

        xhr.onerror = () => {
          file.__failed = true
          this.$emit('fail', file, xhr)
          reject(xhr)
        }

        const resolver = this.urlFactory
          ? this.urlFactory(file)
          : Promise.resolve(this.url)

        resolver.then(url => {
          xhr.open(this.method, url, true)
          if (this.headers) {
            Object.keys(this.headers).forEach(key => {
              xhr.setRequestHeader(key, this.headers[key])
            })
          }

          this.xhrs.push(xhr)
          if (this.sendRaw) {
            xhr.send(file)
          }
          else {
            xhr.send(form)
          }
        })
      })
    },
    pick () {
      if (!this.addDisabled) {
        this.$refs.file.click()
      }
    },
    upload () {
      if (this.disable) return
      this.canStartUploads = true
      this.$emit('start')
    },
    abort () {
      this.tasks.forEach(task => { task.uploader.abort() })
    },
    reset () {
      this.abort()
      this.tasks = []
      this.expanded = false
      this.$emit('reset')
    },
    __convertToFilesArray (f) {
      // accepts File[], File, FileList
      let filesArray = []
      if (f instanceof File) filesArray = [f]
      else if (f instanceof FileList) filesArray = Array.prototype.slice.call(f)
      else if (Array.isArray(f)) filesArray = f
      return filesArray
    },
    __readFileAsDataURLPromise (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => { resolve(e.target.result) }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    },
    __isImage (file) {
      return file.type.toUpperCase().startsWith('IMAGE')
    }
  }
}
</script>
