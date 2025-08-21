<template>
  <div class="options-container min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto p-6">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Emoji Manager Settings</h1>
            <p class="text-gray-600 mt-1">Manage your emoji groups and preferences</p>
          </div>
          <div class="flex space-x-3">
            <a-button @click="importConfig" type="default">
              <template #icon><UploadOutlined /></template>
              Import
            </a-button>
            <a-button @click="exportConfig" type="default">
              <template #icon><DownloadOutlined /></template>
              Export
            </a-button>
            <a-button @click="syncToCloud" type="primary" :loading="syncing">
              <template #icon><CloudSyncOutlined /></template>
              Sync to Cloud
            </a-button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-6">
        <!-- Left Sidebar - Group List -->
        <div class="col-span-3">
          <div class="bg-white rounded-lg shadow-sm p-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">Emoji Groups</h3>
              <a-button @click="showAddGroupModal = true" type="primary" size="small">
                <template #icon><PlusOutlined /></template>
              </a-button>
            </div>
            
            <draggable
              v-model="emojiGroups"
              @end="handleGroupReorder"
              item-key="id"
              class="space-y-2"
            >
              <template #item="{ element: group }">
                <div
                  class="group-item p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-primary-300 transition-colors"
                  :class="{ 'border-primary-500 bg-primary-50': selectedGroupId === group.id }"
                  @click="selectGroup(group.id)"
                >
                  <div class="flex items-center space-x-3">
                    <span class="text-xl">{{ group.icon }}</span>
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-gray-900 truncate">{{ group.name }}</div>
                      <div class="text-xs text-gray-500">{{ group.emojis.length }} emojis</div>
                    </div>
                    <a-button
                      type="text"
                      size="small"
                      @click.stop="editGroup(group)"
                      class="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <EditOutlined />
                    </a-button>
                  </div>
                </div>
              </template>
            </draggable>
          </div>
        </div>

        <!-- Main Content - Emoji Management -->
        <div class="col-span-9">
          <div class="bg-white rounded-lg shadow-sm p-6">
            <div v-if="selectedGroup" class="space-y-6">
              <!-- Group Header -->
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <span class="text-2xl">{{ selectedGroup.icon }}</span>
                  <div>
                    <h2 class="text-xl font-semibold text-gray-900">{{ selectedGroup.name }}</h2>
                    <p class="text-gray-600">{{ selectedGroup.emojis.length }} emojis</p>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <a-button @click="showAddEmojiModal = true" type="primary">
                    <template #icon><PlusOutlined /></template>
                    Add Emoji
                  </a-button>
                  <a-button @click="editGroup(selectedGroup)" type="default">
                    <template #icon><EditOutlined /></template>
                    Edit Group
                  </a-button>
                </div>
              </div>

              <!-- Emoji Grid -->
              <div class="border border-gray-200 rounded-lg p-4">
                <draggable
                  v-model="selectedGroup.emojis"
                  @end="handleEmojiReorder"
                  item-key="id"
                  class="grid grid-cols-8 gap-3"
                >
                  <template #item="{ element: emoji }">
                    <div class="emoji-item group relative">
                      <div class="text-3xl text-center p-3 rounded-lg border border-gray-200 hover:border-primary-300 cursor-pointer transition-colors">
                        {{ emoji.content }}
                      </div>
                      <div class="mt-1 text-xs text-gray-600 text-center truncate">{{ emoji.title }}</div>
                      <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a-button
                          type="text"
                          size="small"
                          @click="editEmoji(emoji)"
                          class="bg-white shadow-sm"
                        >
                          <EditOutlined />
                        </a-button>
                      </div>
                    </div>
                  </template>
                </draggable>
              </div>
            </div>

            <div v-else class="text-center py-12">
              <div class="text-gray-400 text-lg mb-2">No group selected</div>
              <p class="text-gray-500">Select a group from the sidebar to manage emojis</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Group Modal -->
    <a-modal
      v-model:open="showAddGroupModal"
      title="Add New Emoji Group"
      @ok="handleAddGroup"
      :ok-button-props="{ disabled: !newGroupForm.name || !newGroupForm.icon }"
    >
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Group Name" required>
          <a-input v-model:value="newGroupForm.name" placeholder="Enter group name" />
        </a-form-item>
        <a-form-item label="Group Icon" required>
          <a-input v-model:value="newGroupForm.icon" placeholder="Enter emoji icon (e.g., 😀)" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Edit Group Modal -->
    <a-modal
      v-model:open="showEditGroupModal"
      title="Edit Emoji Group"
      @ok="handleEditGroup"
    >
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Group Name" required>
          <a-input v-model:value="editGroupForm.name" placeholder="Enter group name" />
        </a-form-item>
        <a-form-item label="Group Icon" required>
          <a-input v-model:value="editGroupForm.icon" placeholder="Enter emoji icon (e.g., 😀)" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Add Emoji Modal -->
    <a-modal
      v-model:open="showAddEmojiModal"
      title="Add New Emoji"
      @ok="handleAddEmoji"
      :ok-button-props="{ disabled: !newEmojiForm.content || !newEmojiForm.title }"
    >
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Emoji" required>
          <a-input v-model:value="newEmojiForm.content" placeholder="Enter emoji (e.g., 😀)" />
        </a-form-item>
        <a-form-item label="Title" required>
          <a-input v-model:value="newEmojiForm.title" placeholder="Enter emoji title" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Edit Emoji Modal -->
    <a-modal
      v-model:open="showEditEmojiModal"
      title="Edit Emoji"
      @ok="handleEditEmoji"
    >
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Emoji" required>
          <a-input v-model:value="editEmojiForm.content" placeholder="Enter emoji (e.g., 😀)" />
        </a-form-item>
        <a-form-item label="Title" required>
          <a-input v-model:value="editEmojiForm.title" placeholder="Enter emoji title" />
        </a-form-item>
      </a-form>
    </a-modal>

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
import { ref, computed, onMounted } from 'vue'
import draggable from 'vuedraggable'
import {
  PlusOutlined,
  EditOutlined,
  UploadOutlined,
  DownloadOutlined,
  CloudSyncOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useEmojiStore } from '../stores/emoji.js'

const emojiStore = useEmojiStore()

// Reactive state
const selectedGroupId = ref(null)
const syncing = ref(false)
const fileInput = ref(null)

// Modals
const showAddGroupModal = ref(false)
const showEditGroupModal = ref(false)
const showAddEmojiModal = ref(false)
const showEditEmojiModal = ref(false)

// Forms
const newGroupForm = ref({ name: '', icon: '' })
const editGroupForm = ref({ id: '', name: '', icon: '' })
const newEmojiForm = ref({ content: '', title: '' })
const editEmojiForm = ref({ id: '', content: '', title: '' })

// Computed
const emojiGroups = computed({
  get: () => emojiStore.emojiGroups,
  set: (value) => {
    const groupIds = value.map(g => g.id)
    emojiStore.updateGroupOrder(groupIds)
  }
})

const selectedGroup = computed(() => {
  return emojiGroups.value.find(g => g.id === selectedGroupId.value)
})

// Methods
const selectGroup = (groupId) => {
  selectedGroupId.value = groupId
}

const handleGroupReorder = () => {
  const groupIds = emojiGroups.value.map(g => g.id)
  emojiStore.updateGroupOrder(groupIds)
}

const handleEmojiReorder = () => {
  if (selectedGroup.value) {
    const emojiIds = selectedGroup.value.emojis.map(e => e.id)
    emojiStore.updateEmojiOrder(selectedGroup.value.id, emojiIds)
  }
}

const handleAddGroup = () => {
  if (newGroupForm.value.name && newGroupForm.value.icon) {
    emojiStore.addEmojiGroup(newGroupForm.value.name, newGroupForm.value.icon)
    newGroupForm.value = { name: '', icon: '' }
    showAddGroupModal.value = false
    message.success('Group added successfully!')
  }
}

const editGroup = (group) => {
  editGroupForm.value = {
    id: group.id,
    name: group.name,
    icon: group.icon
  }
  showEditGroupModal.value = true
}

const handleEditGroup = () => {
  if (editGroupForm.value.name && editGroupForm.value.icon) {
    emojiStore.updateEmojiGroup(editGroupForm.value.id, {
      name: editGroupForm.value.name,
      icon: editGroupForm.value.icon
    })
    showEditGroupModal.value = false
    message.success('Group updated successfully!')
  }
}

const handleAddEmoji = () => {
  if (selectedGroup.value && newEmojiForm.value.content && newEmojiForm.value.title) {
    emojiStore.addEmoji(
      selectedGroup.value.id,
      newEmojiForm.value.content,
      newEmojiForm.value.title
    )
    newEmojiForm.value = { content: '', title: '' }
    showAddEmojiModal.value = false
    message.success('Emoji added successfully!')
  }
}

const editEmoji = (emoji) => {
  editEmojiForm.value = {
    id: emoji.id,
    content: emoji.content,
    title: emoji.title
  }
  showEditEmojiModal.value = true
}

const handleEditEmoji = () => {
  if (editEmojiForm.value.content && editEmojiForm.value.title) {
    emojiStore.updateEmoji(editEmojiForm.value.id, {
      content: editEmojiForm.value.content,
      title: editEmojiForm.value.title
    })
    showEditEmojiModal.value = false
    message.success('Emoji updated successfully!')
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
}

const importConfig = () => {
  fileInput.value?.click()
}

const handleFileImport = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const success = emojiStore.importConfiguration(e.target.result)
      if (success) {
        message.success('Configuration imported successfully!')
        selectedGroupId.value = null // Reset selection
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
  }
}

onMounted(async () => {
  await emojiStore.loadFromStorage()
  // Select first group by default
  if (emojiGroups.value.length > 0) {
    selectedGroupId.value = emojiGroups.value[0].id
  }
})
</script>

<style scoped>
.group-item:hover .group-hover\:opacity-100 {
  opacity: 1;
}

.emoji-item:hover .group-hover\:opacity-100 {
  opacity: 1;
}
</style>