<template>
  <div>
    <div class="layout-padding">
      <q-input v-model="url" />
      <br>
      <div class="bg-black q-pa-sm" style="max-width: 500px">
        <q-uploader dark :url="url" multiple color="lime" float-label="Float label" />
        <br>
        <q-uploader dark hide-underline :url="url" multiple color="orange" float-label="Float label" />
        <br>
        <q-field
          icon="wifi"
          label="Wifi network"
          :count="10"
          helper="We need this for connecting you"
        >
          <q-uploader dark :url="url" multiple color="orange" float-label="Float label" />
        </q-field>
        <br>
        <q-field
          icon="wifi"
          label="Wifi network"
          :count="10"
          helper="We need this for connecting you"
        >
          <q-uploader dark inverted :url="url" multiple color="orange" float-label="Float label" />
        </q-field>
      </div>

      <p class="caption">Single File Upload</p>
      <q-uploader style="max-width: 320px" color="amber" stack-label="Stack Label" :url="url" />

      <p class="caption">No Thumbnails</p>
      <q-uploader style="max-width: 320px" no-thumbnails color="amber" :url="url" />

      <q-toggle v-model="inverted" label="Inverted" />
      <q-toggle v-model="dark" label="Dark" />
      <p class="caption">Multiple File Upload (Only .jpg) - 2 parallel uploads maximum</p>
      <div class="q-pa-sm" :class="this.dark ? 'bg-grey-10 text-orange' : ''">
        <q-uploader
          extensions=".jpg"
          :inverted="inverted"
          :dark="dark"
          auto-expand
          style="max-width: 320px"
          float-label="Upload files"
          multiple
          :url="url"
          ref="upld-url"
          @start="emit('start')"
          @finish="emit('finish')"
          @uploaded="uploaded"
          @add="add"
          @remove:done="removeDone"
          @remove:abort="removeAbort"
          @remove:cancel="removeCancel"
          :parallel-uploads="2"
        />
      </div>
      
      <q-btn color="primary" @click="pick('upld-url')" style="margin-top: 15px">Pick Files</q-btn>
      <q-btn color="primary" @click="reset('upld-url')" style="margin-top: 15px">Reset the above Uploader</q-btn>

      <p class="caption">Multiple File Upload - Firebase Storage helper - 2 parallel uploads maximum</p>
      <div class="text-warning" v-for="alert in firebase.missingFiles" :key="alert" v-html="alert" />
      <div class="text-warning" v-if="firebase.missingFiles.length">
        You might have to restart your dev server after that.
      </div>
      <div class="q-pa-sm" :class="this.dark ? 'bg-grey-10 text-orange' : ''">
        <q-uploader
          extensions=".jpg"
          :inverted="inverted"
          :dark="dark"
          auto-expand
          style="max-width: 320px"
          float-label="Upload files"
          multiple
          ref="upld-firebase"
          :custom="firebase.custom"
          @start="emit('start')"
          @finish="emit('finish')"
          @uploaded="uploaded"
          @add="add"
          @remove:done="removeDone"
          @remove:abort="removeAbort"
          @remove:cancel="removeCancel"
          :parallel-uploads="2"
        />
      </div>

      <q-btn color="primary" @click="pick('upld-firebase')" style="margin-top: 15px">Pick Files</q-btn>
      <q-btn color="primary" @click="reset('upld-firebase')" style="margin-top: 15px">Reset the above Uploader</q-btn>

      <p class="caption">Multiple File Upload - mock upload helper - 3 parallel uploads maximum</p>
      <div class="text-warning" v-for="alert in firebase.missingFiles" :key="alert" v-html="alert" />
      <div class="text-warning" v-if="firebase.missingFiles.length">
        You might have to restart your dev server after that.
      </div>
      <div class="q-pa-sm" :class="this.dark ? 'bg-grey-10 text-orange' : ''">
        <q-uploader
          extensions=".jpg"
          :inverted="inverted"
          :dark="dark"
          auto-expand
          style="max-width: 320px"
          float-label="Upload files"
          multiple
          ref="upld-mock"
          :custom="{uploadHelper: mockUploadHelper}"
          @start="emit('start')"
          @finish="emit('finish')"
          @uploaded="uploaded"
          @add="add"
          @remove:done="removeDone"
          @remove:abort="removeAbort"
          @remove:cancel="removeCancel"
          :parallel-uploads="3"
        />
      </div>

      <q-btn color="primary" @click="pick('upld-mock')" style="margin-top: 15px">Pick Files</q-btn>
      <q-btn color="primary" @click="reset('upld-mock')" style="margin-top: 15px">Reset the above Uploader</q-btn>

      <p class="caption">Single File Upload - No Upload Button</p>
      <q-uploader style="max-width: 320px" hide-upload-button color="amber" stack-label="Stack Label" :url="url" />

      <p class="caption">No Thumbnails - No Upload Button</p>
      <q-uploader style="max-width: 320px" hide-upload-button no-thumbnails color="amber" :url="url" />

      <p class="caption">Multiple File Upload - No Upload Button</p>
      <q-uploader
        style="max-width: 320px"
        float-label="Upload files"
        multiple
        hide-upload-button
        :url="url"
        @start="emit('start')"
        @finish="emit('finish')"
        @uploaded="uploaded"
        @add="add"
        @remove:done="removeDone"
        @remove:abort="removeAbort"
        @remove:cancel="removeCancel"
      />

      <p class="caption">Single File Upload - No Upload Button - No Upload Progress</p>
      <q-uploader style="max-width: 320px" hide-upload-button hide-upload-progress color="amber" stack-label="Stack Label" :url="url" />

      <p class="caption">No Thumbnails - No Upload Button - No Upload Progress</p>
      <q-uploader style="max-width: 320px" hide-upload-button hide-upload-progress no-thumbnails color="amber" :url="url" />

      <p class="caption">Multiple File Upload - No Upload Button - No Upload Progress</p>
      <q-uploader
        style="max-width: 320px"
        float-label="Upload files"
        multiple
        hide-upload-button
        hide-upload-progress
        :url="url"
        @start="emit('start')"
        @finish="emit('finish')"
        @uploaded="uploaded"
        @add="add"
        @remove:done="removeDone"
        @remove:abort="removeAbort"
        @remove:cancel="removeCancel"
      />

      <div class="absolute-right no-pointer-events">
        <q-btn @click="clear" style="pointer-events: all" color="primary">Clear Debug Log</q-btn>
        <div v-for="row in events" :key="row.key">
          {{row.evt}}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import uid from '../../../src/utils/uid'

let firebase, firebaseStorageConfig, storageRef, missingFirebaseFiles = []
try { firebaseStorageConfig = require('data/firebase-credentials.json') }
catch (e) {
  missingFirebaseFiles.push(`<b>Missing file data/firebase-storage.json.</b>
  <br>Please copy firebase-storage-example.json as firebase-storage.json and fill it with your Firebase credentials.
  <br>(It's .gitignore'd, but please double check you don't commit it)`)
}
try { firebase = require('firebase') }
catch (e) {
  missingFirebaseFiles.push('<b>Missing firebase package</b><br>Please do npm install firebase')
}
if (firebase && firebaseStorageConfig) {
  firebase.initializeApp(firebaseStorageConfig)
  const storage = firebase.storage()
  storageRef = storage.ref('quasar-uploader-test')
}

const mockUploadHelper = {
  create ({task, updateProgressBytes, success, failure}) {
    const start = () => {
      let speed = Math.pow(2, 16)
      let uploadedBytes = 0
      let aborted
      const abort = () => {
        aborted = true
        failure()
      }
      const fakeProgresser = () => {
        setTimeout(() => {
          if (aborted) return
          const bytes = Math.floor(speed * (1 + Math.random() / 3))
          uploadedBytes = Math.min(uploadedBytes + bytes, task.file.size)
          updateProgressBytes(uploadedBytes)
          if (uploadedBytes >= task.file.size) success()
          else fakeProgresser()
        }, 1000)
      }
      fakeProgresser()
      return Promise.resolve({ abort })
    }
    return start
  }
}

export default {
  data () {
    return {
      // url: 'http://1.1.1.195/upload.php',
      url: 'http://mockbin.org/bin/bbe7f656-12d6-4877-9fa8-5cd61f9522a9',
      events: [],
      inverted: false,
      dark: false,
      firebase: {
        custom: {
          uploadHelper: 'firebase-storage',
          ref: storageRef,
          hooks: {}
        },
        missingFiles: missingFirebaseFiles
      },
      mockUploadHelper
    }
  },
  methods: {
    pick (ref) {
      this.$refs[ref].pick()
    },
    clear () {
      this.events = []
    },
    keyEvent (evt) {
      return { evt, key: uid() } // avoid [Vue warn]: Duplicate keys detected
    },
    emit (evt) {
      this.events.push(this.keyEvent(evt))
    },
    uploaded (file) {
      this.events.push(this.keyEvent(`uploaded ${file.name}`))
    },
    add (files) {
      this.events.push(this.keyEvent(`add ${files.length}`))
    },
    removeCancel (file) {
      this.events.push(this.keyEvent(`remove:cancel ${file.name}`))
    },
    removeAbort (file) {
      this.events.push(this.keyEvent(`remove:abort ${file.name}`))
    },
    removeDone (file) {
      this.events.push(this.keyEvent(`remove:done ${file.name}`))
    },
    reset (ref) {
      this.$refs[ref].reset()
    }
  }
}
</script>
