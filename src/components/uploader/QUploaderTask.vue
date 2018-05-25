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

    <q-item-side v-if="task.isImage && task.imgSrc" :image="task.imgSrc"></q-item-side>
    <q-item-side v-else :icon="$q.icon.uploader.file" :color="color"></q-item-side>

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
        nopeclass="q-if-end self-center"
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
        nopeclass="q-if-end self-center"
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
    }
  },
  computed: {
    uploaderAction () {
      const { task } = this
      if (task.pausing || task.resuming) { // loading
        return { loading: true }
      }
      if (task.uploader.pause && !task.paused) { // pausable
        return {
          icon: 'pause',
          action: this.__pause
        }
      }
      if (task.uploader.resume && task.paused) { // resumable
        return {
          icon: 'resume',
          action: this.__resume
        }
      }
      if (task.failed) { // retry after fail
        return {
          icon: 'retry',
          action: this.__retry
        }
      }
    },
    taskAction () {
      const { task } = this
      if (task.aborting) { // loading
        return { loading: true }
      }
      if (task.uploaded) {
        return {
          icon: 'discard',
          action: this.__discard
        }
      }
      if (task.uploader.abort && !task.failed) {
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
  watch: {
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
    }
  }
}
</script>
