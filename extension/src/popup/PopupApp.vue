<template>
  <div class="popup-container w-full h-full flex flex-col bg-white">
    <!-- Header -->
    <div class="header bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 relative">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-semibold">Emoji Manager</h1>
        <div class="flex items-center space-x-2">
          <a-button
            type="text"
            @click="showSecondaryMenu = !showSecondaryMenu"
            class="text-white hover:text-primary-100"
          >
            <MenuOutlined />
          </a-button>
          <a-button
            type="text"
            @click="openSettings"
            class="text-white hover:text-primary-100"
          >
            <SettingOutlined />
          </a-button>
        </div>
      </div>
      
      <!-- Secondary Menu -->
      <Transition name="slide-down">
        <div v-show="showSecondaryMenu" class="secondary-menu">
          <a-menu mode="vertical" class="border-0 shadow-none">
            <a-menu-item key="import" @click="importConfig">
              <template #icon><UploadOutlined /></template>
              Import Configuration
            </a-menu-item>
            <a-menu-item key="export" @click="exportConfig">
              <template #icon><DownloadOutlined /></template>
              Export Configuration
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item key="sync" @click="syncToCloud" :disabled="syncing">
              <template #icon>
                <CloudSyncOutlined v-if="!syncing" />
                <LoadingOutlined v-else />
              </template>
              {{ syncing ? 'Syncing...' : 'Sync to Cloud' }}
            </a-menu-item>
          </a-menu>
        </div>
      </Transition>
    </div>

    <!-- Image Scale Control -->
    <div class="p-4 border-b border-gray-200">
      <div class="mb-2">
        <span class="text-sm font-medium text-gray-700">Image Scale: {{ imageScale }}%</span>
      </div>
      <a-slider
        v-model:value="imageScale"
        :min="5"
        :max="150"
        :step="5"
        @change="handleScaleChange"
        class="mb-2"
      />
      <div class="image-preview bg-gray-50 rounded-lg p-3">
        <div class="text-xs text-gray-500 mb-2">Preview:</div>
        <img
          src="https://via.placeholder.com/100x100/3b82f6/white?text=IMG"
          alt="Preview"
          :style="{ transform: `scale(${imageScale / 100})`, transformOrigin: 'center' }"
          class="transition-transform duration-200"
        />
      </div>
    </div>

    <!-- Emoji Groups -->
    <div class="flex-1 overflow-y-auto">
      <div v-for="group in emojiGroups" :key="group.id" class="mb-4">
        <div class="flex items-center px-4 py-2 bg-gray-50 border-b border-gray-200">
          <span class="text-lg mr-2">{{ group.icon }}</span>
          <span class="font-medium text-gray-700">{{ group.name }}</span>
          <span class="ml-auto text-xs text-gray-500">{{ group.emojis.length }}</span>
        </div>
        <div class="emoji-grid">
          <div
            v-for="emoji in group.emojis"
            :key="emoji.id"
            class="emoji-item"
            :title="emoji.title"
            @click="copyEmoji(emoji.content)"
          >
            <div class="text-2xl text-center">{{ emoji.content }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer p-4 border-t border-gray-200 bg-gray-50">
      <div class="flex items-center justify-between text-xs text-gray-500">
        <span>Total: {{ totalEmojis }} emojis</span>
        <span v-if="lastSyncTime">
          Last sync: {{ formatDate(lastSyncTime) }}
        </span>
      </div>
    </div>

    <!-- Hidden file input for import -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      @change="handleFileImport"
      class="hidden"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import {
  MenuOutlined,
  SettingOutlined,
  UploadOutlined,
  DownloadOutlined,
  CloudSyncOutlined,
  LoadingOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useEmojiStore } from '../stores/emoji.js'

const emojiStore = useEmojiStore()
const showSecondaryMenu = ref(false)
const syncing = ref(false)
const fileInput = ref(null)

// Computed properties
const imageScale = computed({
  get: () => emojiStore.imageScale,
  set: (value) => emojiStore.updateImageScale(value)
})

const emojiGroups = computed(() => emojiStore.emojiGroups)
const totalEmojis = computed(() => emojiStore.totalEmojis)
const lastSyncTime = computed(() => emojiStore.lastSyncTime)

// Methods
const handleScaleChange = (value) => {
  emojiStore.updateImageScale(value)
}

const openSettings = () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('options.html')
  })
}

const copyEmoji = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    message.success(`Copied ${content} to clipboard!`)
  } catch (error) {
    console.error('Failed to copy emoji:', error)
    message.error('Failed to copy emoji')
  }
}

const exportConfig = () => {
  const config = emojiStore.exportConfiguration()
  const blob = new Blob([config], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `emoji-manager-config-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  message.success('Configuration exported successfully!')
  showSecondaryMenu.value = false
}

const importConfig = () => {
  fileInput.value?.click()
  showSecondaryMenu.value = false
}

const handleFileImport = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const success = emojiStore.importConfiguration(e.target.result)
      if (success) {
        message.success('Configuration imported successfully!')
      } else {
        message.error('Failed to import configuration. Please check the file format.')
      }
    }
    reader.readAsText(file)
  }
}

const syncToCloud = async () => {
  syncing.value = true
  try {
    const success = await emojiStore.syncToCloud()
    if (success) {
      message.success('Configuration synced to cloud successfully!')
    } else {
      message.error('Failed to sync to cloud')
    }
  } finally {
    syncing.value = false
    showSecondaryMenu.value = false
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString()
}

// Close secondary menu when clicking outside
const handleClickOutside = (event) => {
  if (!event.target.closest('.header')) {
    showSecondaryMenu.value = false
  }
}

onMounted(async () => {
  await emojiStore.loadFromStorage()
  document.addEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.popup-container {
  min-height: 600px;
}

.secondary-menu {
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>