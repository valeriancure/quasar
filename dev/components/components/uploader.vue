<template>
  <div>
    <div class="layout-padding">
      <q-tabs>
        <q-tab v-for="tab in tabs" :key="`tab-${tab.name}`" :default="tab.name === 'mock'" slot="title" :name="tab.name" :icon="tab.icon" :label="tab.label" />
        <q-tab-pane v-for="tab in tabs" :name="tab.name" :key="`tab-pane-${tab.name}`">
          <div v-if="tab.name === 'mock'">
            <h4>'Fake' upload helper, mocks upload progress with setTimeout().</h4>
          </div>
          <div v-if="tab.name === 'xhr'">
            <h4>Out of the box XMLHttpRequest upload helper.</h4>
            <q-input v-model="url" />
          </div>
          <div v-if="tab.name === 'firebase'">
            <h4>Out of the box Firebase Storage upload helper.</h4>
            <div class="text-warning" v-for="alert in firebaseMissingFiles" :key="alert" v-html="alert" />
            <div class="text-warning" v-if="firebaseMissingFiles.length">
              You might have to restart your dev server after that.
            </div>
          </div>
          <br>
          <div class="bg-black q-pa-sm" style="max-width: 500px">
            <q-uploader dark :url="url" :custom="tab.custom" multiple color="lime" float-label="Float label" />
            <br>
            <q-uploader dark hide-underline :url="url" :custom="tab.custom" multiple color="orange" float-label="Float label" />
            <br>
            <q-field
              icon="wifi"
              label="Wifi network"
              :count="10"
              helper="We need this for connecting you"
            >
              <q-uploader dark :url="url" :custom="tab.custom" multiple color="orange" float-label="Float label" />
            </q-field>
            <br>
            <q-field
              icon="wifi"
              label="Wifi network"
              :count="10"
              helper="We need this for connecting you"
            >
              <q-uploader dark inverted :url="url" :custom="tab.custom" multiple color="orange" float-label="Float label" />
            </q-field>
          </div>

          <p class="caption">Single File Upload</p>
          <q-uploader style="max-width: 320px" color="amber" stack-label="Stack Label" :url="url" :custom="tab.custom" />

          <p class="caption">No Thumbnails</p>
          <q-uploader style="max-width: 320px" no-thumbnails color="amber" :url="url" :custom="tab.custom" />

          <q-toggle v-model="inverted" label="Inverted" />
          <q-toggle v-model="dark" label="Dark" />
          <p class="caption">Multiple File Upload (Only .jpg) - 2 parallel uploads maximum</p>
          <div class="q-pa-sm" :class="dark ? 'bg-grey-10 text-orange' : ''">
            <q-uploader
              extensions=".jpg"
              :inverted="inverted"
              :dark="dark"
              auto-expand
              style="max-width: 320px"
              float-label="Upload files"
              multiple
              :url="url"
              :custom="tab.custom"
              :ref="`upld-${tab.name}`"
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
          
          <q-btn color="primary" @click="pick(`upld-${tab.name}`)" style="margin-top: 15px">Pick Files</q-btn>
          <q-btn color="primary" @click="reset(`upld-${tab.name}`)" style="margin-top: 15px">Reset the above Uploader</q-btn>

          <p class="caption">Single File Upload - No Upload Button</p>
          <q-uploader style="max-width: 320px" hide-upload-button color="amber" stack-label="Stack Label" :url="url" :custom="tab.custom" />

          <p class="caption">No Thumbnails - No Upload Button</p>
          <q-uploader style="max-width: 320px" hide-upload-button no-thumbnails color="amber" :url="url" :custom="tab.custom" />

          <p class="caption">Multiple File Upload - No Upload Button</p>
          <q-uploader
            style="max-width: 320px"
            float-label="Upload files"
            multiple
            hide-upload-button
            :url="url"
            :custom="tab.custom"
            @start="emit('start')"
            @finish="emit('finish')"
            @uploaded="uploaded"
            @add="add"
            @remove:done="removeDone"
            @remove:abort="removeAbort"
            @remove:cancel="removeCancel"
          />

          <p class="caption">Single File Upload - No Upload Button - No Upload Progress</p>
          <q-uploader style="max-width: 320px" hide-upload-button hide-upload-progress color="amber" stack-label="Stack Label" :url="url" :custom="tab.custom" />

          <p class="caption">No Thumbnails - No Upload Button - No Upload Progress</p>
          <q-uploader style="max-width: 320px" hide-upload-button hide-upload-progress no-thumbnails color="amber" :url="url" :custom="tab.custom" />

          <p class="caption">Multiple File Upload - No Upload Button - No Upload Progress</p>
          <q-uploader
            style="max-width: 320px"
            float-label="Upload files"
            multiple
            hide-upload-button
            hide-upload-progress
            :url="url"
            :custom="tab.custom" 
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
        </q-tab-pane>
      </q-tabs>
    </div>
  </div>
</template>

<script>
import uid from '../../../src/utils/uid'

let firebase, firebaseStorageConfig, storageRef, firebaseMissingFiles = []
try { firebaseStorageConfig = require('data/firebase-credentials.json') }
catch (e) {
  firebaseMissingFiles.push(`<b>Missing file data/firebase-storage.json.</b>
  <br>Please copy firebase-storage-example.json as firebase-storage.json and fill it with your Firebase credentials.
  <br>(It's .gitignore'd, but please double check you don't commit it)`)
}
try { firebase = require('firebase') }
catch (e) {
  firebaseMissingFiles.push('<b>Missing firebase package</b><br>Please do npm install firebase')
}
if (firebase && firebaseStorageConfig) {
  firebase.initializeApp(firebaseStorageConfig)
  const storage = firebase.storage()
  storageRef = storage.ref('quasar-uploader-test')
}

const mockUploadHelper = {
  create ({task, updateProgressBytes, success, failure}) {
    const start = () => {
      let speed = Math.pow(2, 14)
      let uploadedBytes = 0
      let aborted, paused
      const fakeProgresser = () => {
        setTimeout(() => {
          if (aborted || paused) return
          const bytes = Math.floor(speed * (1 + Math.random() / 3))
          uploadedBytes = Math.min(uploadedBytes + bytes, task.file.size)
          updateProgressBytes(uploadedBytes)
          if (uploadedBytes >= task.file.size) success()
          else fakeProgresser()
        }, Math.floor(250 * (1 - Math.random() / 3)))
      }
      const abort = () => {
        aborted = true
        failure()
      }
      const resume = () => {
        const fakeLag = Math.floor(2000 * (1 + Math.random()))
        return new Promise(resolve => {
          setTimeout(() => {
            paused = false
            fakeProgresser()
            resolve({ resumed: true })
          }, fakeLag)
        })
      }
      const pause = () => {
        const fakeLag = Math.floor(1000 * (1 + Math.random()))
        return new Promise(resolve => {
          setTimeout(() => {
            paused = true
            resolve({ paused, resume })
          }, fakeLag)
        })
      }
      fakeProgresser()
      return Promise.resolve({ abort, pause })
    }
    return start
  }
}

const tabs = [
  {
    name: 'mock',
    label: 'Simple Mock',
    icon: 'timer',
    custom: {
      uploadHelper: mockUploadHelper
    }
  },
  {
    name: 'xhr',
    label: 'XHR Helper',
    icon: 'http'
  },
  {
    name: 'firebase',
    label: 'Firebase Helper',
    icon: 'fas fa-fire',
    custom: {
      uploadHelper: 'firebase-storage',
      ref: storageRef
    }
  }
]

export default {
  data () {
    return {
      // url: 'http://1.1.1.195/upload.php',
      url: 'http://mockbin.org/bin/bbe7f656-12d6-4877-9fa8-5cd61f9522a9',
      events: [],
      inverted: false,
      dark: false,
      tabs,
      firebaseMissingFiles
    }
  },
  methods: {
    pick (ref) {
      this.$refs[ref][0].pick()
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
