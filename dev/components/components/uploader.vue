<template>
  <div>
    <div class="layout-padding">
      <p class="caption"><big>With URL</big></p>
      <q-input v-model="url" />
      <p class="caption">Single File Upload</p>
      <q-uploader style="max-width: 320px" color="amber" stack-label="Stack Label" :url="url" />

      <p class="caption">No Thumbnails</p>
      <q-uploader style="max-width: 320px" no-thumbnails color="amber" :url="url" />

      <p class="caption">Multiple File Upload</p>
      <q-uploader
        style="max-width: 320px"
        float-label="Upload files"
        multiple
        :url="url"
        ref="upld"
        @start="emit('start')"
        @finish="emit('finish')"
        @uploaded="uploaded"
        @add="add"
        @remove:done="removeDone"
        @remove:abort="removeAbort"
        @remove:cancel="removeCancel"
      />

      <q-btn color="primary" @click="reset" style="margin-top: 15px">Reset the above Uploader</q-btn>

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

      <p class="caption"><big>With Firebase Storage</big></p>
      <div class="text-bold warning" v-for="alert in missingFirebaseFiles" :key="alert" v-html="alert">
      </div>
      <div class="text-bold warning" v-if="missingFirebaseFiles.length">
        You may have to restart your dev server after that.
      </div>
      <p class="caption">Multiple File Upload</p>
      <q-uploader
        style="max-width: 320px"
        float-label="Upload files"
        multiple
        :firebase-storage="storageRef"
        @start="emit('start')"
        @finish="emit('finish')"
        @uploaded="uploaded"
        @add="add"
        @remove:done="removeDone"
        @remove:abort="removeAbort"
        @remove:cancel="removeCancel"
      />
      <p class="caption">Multiple File Upload and File Filter</p>
      <p>Accept only *.png files</p>
      <q-uploader
        style="max-width: 320px"
        float-label="Upload files"
        multiple
        :firebase-storage="storageRef"
        :file-filter="file => /.+\.png$/.exec(file.name)"
        @start="emit('start')"
        @finish="emit('finish')"
        @uploaded="uploaded"
        @add="add"
        @remove:done="removeDone"
        @remove:abort="removeAbort"
        @remove:cancel="removeCancel"
        @filtered="filtered"
      />
      <p class="caption">Multiple File Upload and custom UploadTask</p>
      <p>Here, the UploadTask's file name is suffixed with a timestamp</p>
      <q-uploader
        style="max-width: 320px"
        float-label="Upload files"
        multiple
        :firebase-storage="makeUploadTaskWithTimestamp"
        @start="emit('start')"
        @finish="emit('finish')"
        @uploaded="uploaded"
        @add="add"
        @remove:done="removeDone"
        @remove:abort="removeAbort"
        @remove:cancel="removeCancel"
        @filtered="filtered"
      />
      <p class="caption">Multiple File Upload and additionalFields</p>
      <p>additionalFields will be used to populate customMetadata</p>
      <q-uploader
        style="max-width: 320px"
        float-label="Upload files"
        multiple
        :firebase-storage="storageRef"
        :additionalFields="additionalFields"
        @start="emit('start')"
        @finish="emit('finish')"
        @uploaded="uploaded"
        @add="add"
        @remove:done="removeDone"
        @remove:abort="removeAbort"
        @remove:cancel="removeCancel"
        @filtered="filtered"
      />

      <div class="absolute-right no-pointer-events">
        <q-btn @click="clear" style="pointer-events: all" color="primary">Clear Debug Log</q-btn>
        <div v-for="evt in events" :key="evt">
          {{evt}}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
let firebase, firebaseStorageConfig, storageRef, missingFirebaseFiles = []
try { firebaseStorageConfig = require('data/firebase-storage.json') }
catch (e) {
  missingFirebaseFiles.push('<b>Missing file data/firebase-storage.json.</b><br>Please copy firebase-storage-example.json as firebase-storage.json and fill it with your Firebase credentials.')
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
export default {
  data () {
    return {
      url: 'https://posttestserver.com/post.php',
      events: [],
      storageRef,
      additionalFields: [
        { name: 'foo', value: 'bar' },
        { name: 'quasar', value: 'framework' }
      ],
      missingFirebaseFiles
    }
  },
  methods: {
    clear () {
      this.events = []
    },
    emit (evt) {
      this.events.push(evt)
    },
    uploaded (file) {
      this.events.push(`uploaded ${file.name}`)
    },
    add (files) {
      this.events.push(`add ${files.length}`)
    },
    removeCancel (file) {
      this.events.push(`remove:cancel ${file.name}`)
    },
    removeAbort (file) {
      this.events.push(`remove:abort ${file.name}`)
    },
    removeDone (file) {
      this.events.push(`remove:done ${file.name}`)
    },
    filtered (files) {
      this.events.push(`${files.length} files didn't pass the filter`)
    },
    reset () {
      this.$refs.upld.reset()
    },
    makeUploadTaskWithTimestamp (file) {
      const originalName = file.name
      const newFilename = `${Date.now()}.${file.name}`
      const metadata = {
        customMetadata: {
          originalName
        }
      }
      return this.storageRef.child(newFilename).put(file, metadata)
    }
  }
}
</script>
