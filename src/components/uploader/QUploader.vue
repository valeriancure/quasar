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
          <q-uploader-task
            v-for="task in tasks"
            :task="task"
            :key="task.uid"
            :hide-upload-progress="hideUploadProgress"
            :color="color"
            :progressColor="progressColor"
            class="q-uploader-file q-pa-xs"
            @pause="__pause"
            @resume="__resume"
            @retry="__retry"
            @abort="__abort"
            @discard="__discard"
            @delete="__discard"
          />
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
import QUploaderTask from './QUploaderTask'
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

export default {
  name: 'QUploader',
  mixins: [FrameMixin],
  components: {
    QUploaderTask,
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
    maxSize: Number,
    parallelUploads: { // how many upload task to run simultaneously
      type: Number,
      required: false
    },
    maxFiles: Number,
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
          uploadHelper = this.custom.uploadHelper
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
      return this.tasks.filter(task => !task.rejected)
    },
    queuedTasks () {
      return this.acceptedTasks.filter(task => !task.uploading && !task.uploaded && !task.failed)
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
      return (this.extensions || '').split(',').map(ext => {
        ext = ext.trim()
        // support "image/*"
        if (ext.endsWith('/*')) {
          ext = ext.slice(0, ext.length - 1)
        }
        return ext
      })
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
      if (this.shouldStartUploads) {
        this.__processQueue()
      }
    },
    uploadingTasks () {
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
      if (!this.__checkNumberOfFiles()) return
      if (!this.__checkExtensionOrType(file)) return // extension and type don't match
      if (!this.__checkSize(file)) return
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
        uploader: null
      }
      this.__initState(task)
      this.__handleNewTask(task)
    },
    __initState (task) {
      const state = {
        rejected: false,
        uploading: false,
        uploaded: false,
        progressBytes: 0,
        progressPercent: 0,
        pausing: false,
        resuming: false,
        paused: false,
        aborting: false,
        failed: false
      }
      Object.assign(task, state)
    },
    __handleNewTask (task) {
      if (!task.rejected) {
        this.__addUploaderToTask(task)
        this.tasks.push(task)
      }
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
        start: this.uploadHelper.create(uploaderArguments),
        pause: null, // for reactivity in child prop
        resume: null, // idem
        abort: null // idem
      }
    },
    __startUpload (task) {
      task.uploading = true
      task.uploader.start().then(methods => {
        task.uploader.abort = methods.abort
        task.uploader.pause = methods.pause
        task.uploader.resume = null // declared for reactivity. Will be set if pause() is called.
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
      task.failed = false
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
    __checkNumberOfFiles () {
      return !this.maxFiles || (this.tasks.length < this.maxFiles)
    },
    __checkExtensionOrType (file) {
      return this.computedExtensions.some(ext => {
        return file.type.toUpperCase().startsWith(ext.toUpperCase()) ||
          file.name.toUpperCase().endsWith(ext.toUpperCase())
      })
    },
    __checkSize (file) {
      return !this.maxSize || (file.size <= this.maxSize)
    },
    __pause (task) {
      if (task.uploader.pause && !task.pausing) {
        task.pausing = true
        Promise.resolve(task.uploader.pause()) // pause() might return a promise or not so we wrap in a Promise.resolve()
          .then(res => { // { paused, resume }
            task.pausing = false
            task.paused = res.paused
            task.uploader.resume = res.resume
          })
          .catch(err => {
            task.pausing = false
            this.__error({ err, task })
          })
      }
    },
    __resume (task) {
      if (task.uploader.resume && !task.resuming) {
        task.resuming = true
        Promise.resolve(task.uploader.resume()) // resume() might return a promise or not so we wrap in a Promise.resolve()
          .then(res => { // { resumed }
            task.resuming = false
            task.paused = !res.resumed
            task.uploader.resume = null
          })
          .catch(err => {
            task.resuming = false
            this.__error({ err, task })
          })
      }
    },
    __retry (task) {
      this.__initState(task)
      this.__addUploaderToTask(task)
      this.__processQueue()
    },
    __abort (task) {
      if (task.uploader.abort && !task.aborting && !task.uploaded) {
        task.aborting = true
        Promise.resolve(task.uploader.abort()) // abort() might return a promise or not so we wrap in a Promise.resolve()
          .then(res => { // { aborted }
            task.aborting = false
            task.failed = res.aborted
          })
          .catch(err => {
            task.aborting = false
            this.__error({ err, task })
          })
      }
    },
    __discard (task) {
      this.tasks = this.tasks.filter(t => t.uid !== task.uid)
    },
    __pick () {
      if (!this.addDisabled && this.$q.platform.is.mozilla) {
        this.$refs.file.click()
      }
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
      this.canStartUploads = false
      this.tasks.forEach(this.__abort)
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
    __isImage (file) {
      return file.type.toUpperCase().startsWith('IMAGE')
    }
  }
}
</script>
