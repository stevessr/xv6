import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Types are defined as JSDoc comments for JavaScript
/**
 * @typedef {Object} Emoji
 * @property {string} id
 * @property {string} content
 * @property {string} title
 * @property {string} groupId
 * @property {number} order
 */

/**
 * @typedef {Object} EmojiGroup
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {number} order
 * @property {Emoji[]} emojis
 */

/**
 * @typedef {Object} Configuration
 * @property {number} imageScale
 * @property {EmojiGroup[]} emojiGroups
 * @property {string} [lastSyncTime]
 * @property {boolean} cloudSyncEnabled
 */

export const useEmojiStore = defineStore('emoji', () => {
  // State
  const imageScale = ref(100) // 5% to 150%
  /** @type {import('vue').Ref<EmojiGroup[]>} */
  const emojiGroups = ref([
    {
      id: 'smileys',
      name: 'Smileys & Emotion',
      icon: '😀',
      order: 1,
      emojis: [
        { id: '1', content: '😀', title: 'Grinning Face', groupId: 'smileys', order: 1 },
        { id: '2', content: '😃', title: 'Grinning Face with Big Eyes', groupId: 'smileys', order: 2 },
        { id: '3', content: '😄', title: 'Grinning Face with Smiling Eyes', groupId: 'smileys', order: 3 },
        { id: '4', content: '😁', title: 'Beaming Face with Smiling Eyes', groupId: 'smileys', order: 4 },
        { id: '5', content: '😆', title: 'Grinning Squinting Face', groupId: 'smileys', order: 5 },
        { id: '6', content: '😅', title: 'Grinning Face with Sweat', groupId: 'smileys', order: 6 }
      ]
    },
    {
      id: 'animals',
      name: 'Animals & Nature',
      icon: '🐶',
      order: 2,
      emojis: [
        { id: '7', content: '🐶', title: 'Dog Face', groupId: 'animals', order: 1 },
        { id: '8', content: '🐱', title: 'Cat Face', groupId: 'animals', order: 2 },
        { id: '9', content: '🐭', title: 'Mouse Face', groupId: 'animals', order: 3 },
        { id: '10', content: '🐹', title: 'Hamster Face', groupId: 'animals', order: 4 }
      ]
    }
  ])
  /** @type {import('vue').Ref<string>} */
  const lastSyncTime = ref()
  const cloudSyncEnabled = ref(false)

  // Computed
  const totalEmojis = computed(() => {
    return emojiGroups.value.reduce((total, group) => total + group.emojis.length, 0)
  })

  /** @type {import('vue').ComputedRef<Configuration>} */
  const configuration = computed(() => ({
    imageScale: imageScale.value,
    emojiGroups: emojiGroups.value,
    lastSyncTime: lastSyncTime.value,
    cloudSyncEnabled: cloudSyncEnabled.value
  }))

  // Actions
  const updateImageScale = (scale) => {
    imageScale.value = Math.max(5, Math.min(150, scale))
    saveToStorage()
  }

  const updateEmojiOrder = (groupId, emojiIds) => {
    const group = emojiGroups.value.find(g => g.id === groupId)
    if (group) {
      const emojiMap = new Map(group.emojis.map(e => [e.id, e]))
      group.emojis = emojiIds.map((id, index) => {
        const emoji = emojiMap.get(id)
        return { ...emoji, order: index + 1 }
      })
      saveToStorage()
    }
  }

  const updateGroupOrder = (groupIds) => {
    const groupMap = new Map(emojiGroups.value.map(g => [g.id, g]))
    emojiGroups.value = groupIds.map((id, index) => {
      const group = groupMap.get(id)
      return { ...group, order: index + 1 }
    })
    saveToStorage()
  }

  const addEmojiGroup = (name, icon) => {
    /** @type {EmojiGroup} */
    const newGroup = {
      id: Date.now().toString(),
      name,
      icon,
      order: emojiGroups.value.length + 1,
      emojis: []
    }
    emojiGroups.value.push(newGroup)
    saveToStorage()
    return newGroup
  }

  const updateEmojiGroup = (groupId, updates) => {
    const group = emojiGroups.value.find(g => g.id === groupId)
    if (group) {
      Object.assign(group, updates)
      saveToStorage()
    }
  }

  const addEmoji = (groupId, content, title) => {
    const group = emojiGroups.value.find(g => g.id === groupId)
    if (group) {
      /** @type {Emoji} */
      const newEmoji = {
        id: Date.now().toString(),
        content,
        title,
        groupId,
        order: group.emojis.length + 1
      }
      group.emojis.push(newEmoji)
      saveToStorage()
      return newEmoji
    }
  }

  const updateEmoji = (emojiId, updates) => {
    for (const group of emojiGroups.value) {
      const emoji = group.emojis.find(e => e.id === emojiId)
      if (emoji) {
        Object.assign(emoji, updates)
        saveToStorage()
        break
      }
    }
  }

  const moveEmojiBetweenGroups = (emojiId, fromGroupId, toGroupId) => {
    const fromGroup = emojiGroups.value.find(g => g.id === fromGroupId)
    const toGroup = emojiGroups.value.find(g => g.id === toGroupId)
    
    if (fromGroup && toGroup) {
      const emojiIndex = fromGroup.emojis.findIndex(e => e.id === emojiId)
      if (emojiIndex !== -1) {
        const emoji = fromGroup.emojis.splice(emojiIndex, 1)[0]
        emoji.groupId = toGroupId
        emoji.order = toGroup.emojis.length + 1
        toGroup.emojis.push(emoji)
        saveToStorage()
      }
    }
  }

  const exportConfiguration = () => {
    return JSON.stringify(configuration.value, null, 2)
  }

  const importConfiguration = (configJson) => {
    try {
      /** @type {Configuration} */
      const config = JSON.parse(configJson)
      imageScale.value = config.imageScale
      emojiGroups.value = config.emojiGroups
      lastSyncTime.value = config.lastSyncTime
      cloudSyncEnabled.value = config.cloudSyncEnabled
      saveToStorage()
      return true
    } catch (error) {
      console.error('Failed to import configuration:', error)
      return false
    }
  }

  const syncToCloud = async () => {
    try {
      // This would integrate with a real cloud service
      // For now, we'll simulate a sync
      await new Promise(resolve => setTimeout(resolve, 1000))
      lastSyncTime.value = new Date().toISOString()
      saveToStorage()
      return true
    } catch (error) {
      console.error('Cloud sync failed:', error)
      return false
    }
  }

  const saveToStorage = async () => {
    try {
      await chrome.storage.local.set({
        emojiManagerConfig: configuration.value
      })
    } catch (error) {
      console.error('Failed to save to storage:', error)
    }
  }

  const loadFromStorage = async () => {
    try {
      const result = await chrome.storage.local.get(['emojiManagerConfig'])
      if (result.emojiManagerConfig) {
        const config = result.emojiManagerConfig
        imageScale.value = config.imageScale || 100
        emojiGroups.value = config.emojiGroups || emojiGroups.value
        lastSyncTime.value = config.lastSyncTime
        cloudSyncEnabled.value = config.cloudSyncEnabled || false
      }
    } catch (error) {
      console.error('Failed to load from storage:', error)
    }
  }

  return {
    // State
    imageScale,
    emojiGroups,
    lastSyncTime,
    cloudSyncEnabled,
    
    // Computed
    totalEmojis,
    configuration,
    
    // Actions
    updateImageScale,
    updateEmojiOrder,
    updateGroupOrder,
    addEmojiGroup,
    updateEmojiGroup,
    addEmoji,
    updateEmoji,
    moveEmojiBetweenGroups,
    exportConfiguration,
    importConfiguration,
    syncToCloud,
    saveToStorage,
    loadFromStorage
  }
})