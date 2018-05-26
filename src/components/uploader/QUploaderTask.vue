<template>
  <q-item class="q-uploader-file q-pa-xs">
    <q-progress
      v-if="!hideUploadProgress"
      class="q-uploader-progress-bg absolute-full"
      :color="task.failed ? 'negative' : progressColor"
      :percentage="task.progressPercent"
      height="100%"
    ></q-progress>
    <div class="q-uploader-progress-text absolute" v-if="!hideUploadProgress">
      {{ task.progressPercent }}%
    </div>

    <q-item-side v-show="imgLoaded">
      <img ref="img" class="q-item-image" />
    </q-item-side>
    <q-item-side v-show="!imgLoaded" :icon="$q.icon.uploader.file" :color="color"></q-item-side>

    <q-item-main :label="task.file.name" :sublabel="task.humanSize"></q-item-main>

    <q-item-side right v-if="uploaderAction">
      <q-item-tile
        v-if="!uploaderAction.loading"
        :icon="$q.icon.uploader[uploaderAction.icon]"
        :color="color"
        class="cursor-pointer"
        @click.native="uploaderAction.action"
      ></q-item-tile>
      <q-spinner
        v-else
        size="24px"
        :color="color"
        class="self-center"
      ></q-spinner>
    </q-item-side>

    <q-item-side right v-if="taskAction">
      <q-item-tile
        v-if="!taskAction.loading"
        :icon="$q.icon.uploader[taskAction.icon]"
        :color="color"
        class="cursor-pointer"
        @click.native="taskAction.action"
      ></q-item-tile>
      <q-spinner
        v-else
        size="24px"
        :color="color"
        class="self-center"
      ></q-spinner>
    </q-item-side>

  </q-item>
</template>

<script>
// import { humanStorageSize } from '../../utils/format'
import { QSpinner } from '../spinner'
import { QProgress } from '../progress'
import { QItem, QItemSide, QItemMain, QItemTile } from '../list'

export default {
  name: 'QUploaderTask',
  mixins: [],
  components: {
    QSpinner,
    QProgress,
    QItem,
    QItemSide,
    QItemMain,
    QItemTile
  },
  props: {
    task: {
      type: Object,
      required: true
    },
    hideUploadProgress: Boolean,
    color: String,
    progressColor: String
  },
  data () {
    return {
      imgLoaded: false
    }
  },
  computed: {
    state () {
      const task = this.task
      return {
        pausing: task.pausing,
        resuming: task.resuming,
        aborting: task.aborting,
        canPause: task.uploader.pause,
        canResume: task.uploader.resume,
        canAbort: task.uploader.abort,
        paused: task.paused,
        failed: task.failed,
        uploading: task.uploading,
        uploaded: task.uploaded
      }
    },
    uploaderAction () {
      const { state } = this
      if (state.aborting || state.uploaded) return null
      if (state.pausing || state.resuming) { // loading
        return { loading: true }
      }
      if (state.failed) { // retry after fail
        return {
          icon: 'retry',
          action: this.__retry
        }
      }
      if (state.canPause && !state.paused) { // pausable
        return {
          icon: 'pause',
          action: this.__pause
        }
      }
      if (state.canResume && state.paused) { // resumable
        return {
          icon: 'resume',
          action: this.__resume
        }
      }
      return null
    },
    taskAction () {
      const { state } = this
      if (state.aborting) { // loading
        return { loading: true }
      }
      if (state.uploaded) {
        return {
          icon: 'discard',
          action: this.__discard
        }
      }
      if (state.canAbort && !state.failed) {
        return {
          icon: 'abort',
          action: this.__abort
        }
      }
      return {
        icon: 'delete',
        action: this.__delete
      }
    }
  },
  mounted () {
    this.injectImgSrc()
  },
  watch: {
    'task.uid' () {
      this.injectImgSrc()
    }
  },
  methods: {
    __pause () {
      this.$emit('pause', this.task)
    },
    __resume () {
      this.$emit('resume', this.task)
    },
    __retry () {
      this.$emit('retry', this.task)
    },
    __abort (task) {
      this.$emit('abort', this.task)
    },
    __discard (task) {
      this.$emit('discard', this.task)
    },
    __delete (task) {
      this.$emit('delete', this.task)
    },
    __readFileAsDataURLPromise (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => { resolve(e.target.result) }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    },
    injectImgSrc () {
      if (this.task.isImage) {
        this.imgLoaded = false
        this.__readFileAsDataURLPromise(this.task.file).then(src => {
          this.$refs['img'].src = src
          this.imgLoaded = true
        })
      }
    }
  }
}
</script>
