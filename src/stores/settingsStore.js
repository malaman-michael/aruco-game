import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    sections: {
      // ---------- GENERALE ----------
      general: {
        title: '⚙️ Generale',
        items: [],
        options: {
          language: 'it',
          voiceRate: 1.0,
          voiceVolume: 1.0,
          voicePitch: 1.0,
          narrativeMode: 'dettagliata',
          autoWaitSeconds: 2,
          repeatLastKeyEnabled: true
        }
      },

      // ---------- GIOCATORI ----------
      players: {
        title: '👥 Giocatori',
        items: [
          {
            id: 'player1', name: 'Guerriero', muted: false,
            pronoun: 'lui', startTurnPhrase: 'Ora tocca a {name}', endTurnPhrase: '{name} conclude il turno',
            announceDamage: true, announceMoves: true
          },
          {
            id: 'player2', name: 'Mago', muted: false,
            pronoun: 'lui', startTurnPhrase: 'Ora tocca a {name}', endTurnPhrase: '{name} conclude il turno',
            announceDamage: true, announceMoves: true
          },
          {
            id: 'player3', name: 'Ladro', muted: false,
            pronoun: 'lui', startTurnPhrase: 'Ora tocca a {name}', endTurnPhrase: '{name} conclude il turno',
            announceDamage: true, announceMoves: true
          },
          {
            id: 'player4', name: 'Chierico', muted: false,
            pronoun: 'lui', startTurnPhrase: 'Ora tocca a {name}', endTurnPhrase: '{name} conclude il turno',
            announceDamage: true, announceMoves: true
          }
        ],
        options: {
          collectivePreamble: 'I nostri eroi:',
          announceTurnStart: true,
          announceTurnEnd: true
        }
      },

      // ---------- NEMICI ----------
      enemies: {
        title: '👾 Nemici',
        items: [
          {
            id: 'goblin', name: 'Goblin', muted: false,
            appearPhrase: 'Un {name} emerge dall’ombra!',
            hitPhrase: '{name} subisce {damage} danni',
            deathPhrase: '{name} viene sconfitto!',
            deathStyle: 'normale'
          },
          {
            id: 'troll', name: 'Troll', muted: false,
            appearPhrase: 'Un {name} emerge dall’ombra!',
            hitPhrase: '{name} subisce {damage} danni',
            deathPhrase: '{name} viene sconfitto!',
            deathStyle: 'normale'
          },
          {
            id: 'scheletro', name: 'Scheletro', muted: false,
            appearPhrase: 'Un {name} emerge dall’ombra!',
            hitPhrase: '{name} subisce {damage} danni',
            deathPhrase: '{name} viene sconfitto!',
            deathStyle: 'normale'
          }
        ],
        options: {
          detailedDamage: true,
          announceRemainingHp: 'sempre'
        }
      },

      // ---------- STANZA ----------
      room: {
        title: '🚪 Stanza',
        items: [
          { id: 'room_desc', name: 'Descrivi la stanza', muted: false },
          { id: 'room_exits', name: 'Uscite disponibili', muted: false },
          { id: 'room_secret', name: 'Porte segrete', muted: false }
        ],
        options: {
          entryMessage: 'Varcate la soglia di {roomName}',
          detailedDescription: true,
          listExits: true,
          announceSecretDoors: true,
          secretDoorRevealCheck: true,
          ambientSoundEnabled: false
        }
      },

      // ---------- COMBATTIMENTO ----------
      combat: {
        title: '⚔️ Combattimento',
        items: [
          { id: 'initiative', name: 'Iniziativa', muted: false },
          { id: 'hit', name: 'Colpo subito', muted: false },
          { id: 'critical', name: 'Colpo critico', muted: false },
          { id: 'death', name: 'Morte di un nemico', muted: false }
        ],
        options: {
          combatStartPhrase: 'Inizia il combattimento!',
          announceInitiativeOrder: true,
          criticalHitPhrase: 'Colpo critico! {name} infligge {damage} danni!',
          missPhrase: '{name} manca il bersaglio',
          escapePhrase: '{name} si dà alla fuga',
          announceDiceRolls: 'sempre',
          vocalFlourishes: false
        }
      },

      // ---------- CARTE TESORI ----------
      treasureCards: {
        title: '💰 Carte Tesori',
        items: [
          { id: 'treasure_gold', name: 'Oro trovato', muted: false },
          { id: 'treasure_item', name: 'Oggetto magico', muted: false },
          { id: 'treasure_trap', name: 'Trappola nel baule', muted: false }
        ],
        options: {
          revealCardName: 'sempre',
          goldPhrase: 'Trovi {amount} monete d’oro!',
          magicItemPhrase: 'Ottieni {itemName}',
          trapPhrase: 'Scatta una trappola! Subisci {damage} danni',
          playTreasureSound: true
        }
      },

      // ---------- SISTEMA ----------
      system: {
        title: '🔧 Sistema',
        items: [],
        options: {
          assistantActivatedMsg: 'Assistente vocale attivato.',
          confirmPlacementMsg: 'Pezzo posizionato',
          skipMsg: 'Saltato',
          errorNoMapMsg: 'Nessuna mappa selezionata',
          promptCommandMsg: 'Premi spazio per confermare',
          completionMsg: 'Hai posizionato tutti i pezzi. Buon divertimento!'
        }
      },

      // ---------- GESTI DELLA MANO ----------
      gestures: {
        title: '✋ Gesti della mano',
        items: [
          { id: 'gest_swipe_up', gesture: 'swipe_up', action: 'next_piece', enabled: true },
          { id: 'gest_swipe_down', gesture: 'swipe_down', action: 'prev_piece', enabled: true },
          { id: 'gest_swipe_left', gesture: 'swipe_left', action: 'confirm', enabled: true },
          { id: 'gest_swipe_right', gesture: 'swipe_right', action: 'skip', enabled: true },
          { id: 'gest_double_tap', gesture: 'double_tap', action: 'repeat', enabled: true },
          { id: 'gest_pinch', gesture: 'pinch', action: 'toggle_voice', enabled: false }
        ],
        options: {
          enableGestures: true,
          gestureSensitivity: 0.5
        }
      },

      // ---------- COMANDI VOCALI ----------
      voiceCommands: {
        title: '🎤 Comandi vocali',
        items: [
          { id: 'cmd_next', phrase: 'prossimo', action: 'next_piece', enabled: true },
          { id: 'cmd_prev', phrase: 'precedente', action: 'prev_piece', enabled: true },
          { id: 'cmd_confirm', phrase: 'posiziona', action: 'confirm', enabled: true },
          { id: 'cmd_skip', phrase: 'salta', action: 'skip', enabled: true },
          { id: 'cmd_repeat', phrase: 'ripeti', action: 'repeat', enabled: true },
          { id: 'cmd_voice', phrase: 'attiva voce', action: 'toggle_voice', enabled: true }
        ],
        options: {
          enableVoiceCommands: true,
          continuousListening: false,
          confidenceThreshold: 0.8
        }
      }
    }
  }),

  getters: {
    getSection: (state) => (sectionKey) => state.sections[sectionKey] || null,
    getSectionOptions: (state) => (sectionKey) => state.sections[sectionKey]?.options || {}
  },

  actions: {
    // Carica da localStorage (merge profondo)
    loadFromStorage() {
      const saved = localStorage.getItem('gameSettings')
      if (saved) {
        try {
          const data = JSON.parse(saved)
          for (const sectionKey in this.sections) {
            const savedSection = data.sections?.[sectionKey]
            if (savedSection) {
              // Items: merge per ID
              if (savedSection.items && this.sections[sectionKey].items) {
                for (const savedItem of savedSection.items) {
                  const targetItem = this.sections[sectionKey].items.find(it => it.id === savedItem.id)
                  if (targetItem) {
                    Object.assign(targetItem, savedItem)
                  }
                }
              }
              // Options: merge diretto
              if (savedSection.options) {
                Object.assign(this.sections[sectionKey].options, savedSection.options)
              }
            }
          }
        } catch (e) { console.error(e) }
      }
    },

    // Salva su localStorage
    saveToStorage() {
      localStorage.setItem('gameSettings', JSON.stringify({
        sections: this.sections
      }))
    },

    // Sposta un item su/giù (per le sezioni che hanno items)
    moveItem(sectionKey, itemId, direction) {
      const items = this.sections[sectionKey].items
      if (!items) return
      const idx = items.findIndex(i => i.id === itemId)
      if (idx === -1) return
      if (direction === 'up' && idx > 0) {
        [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]]
      } else if (direction === 'down' && idx < items.length - 1) {
        [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]]
      }
      this.saveToStorage()
    },

    // Aggiorna il nome di un item (per sezioni tradizionali)
    updateItemName(sectionKey, itemId, newName) {
      const item = this.sections[sectionKey].items?.find(i => i.id === itemId)
      if (item) {
        item.name = newName
        this.saveToStorage()
      }
    },

    // Attiva/disattiva la modalità muta (per sezioni tradizionali)
    toggleMute(sectionKey, itemId) {
      const item = this.sections[sectionKey].items?.find(i => i.id === itemId)
      if (item) {
        item.muted = !item.muted
        this.saveToStorage()
      }
    },

    // Attiva/disattiva un comando (gesture o voice)
    toggleEnable(sectionKey, itemId) {
      const item = this.sections[sectionKey].items?.find(i => i.id === itemId)
      if (item) {
        item.enabled = !item.enabled
        this.saveToStorage()
      }
    },

    // Aggiorna proprietà di un gesture (action)
    updateGestureProperty(sectionKey, itemId, prop, value) {
      const item = this.sections[sectionKey].items?.find(i => i.id === itemId)
      if (item) {
        item[prop] = value
        this.saveToStorage()
      }
    },

    // Aggiorna proprietà di un voice command (phrase o action)
    updateVoiceCommandProperty(sectionKey, itemId, prop, value) {
      const item = this.sections[sectionKey].items?.find(i => i.id === itemId)
      if (item) {
        item[prop] = value
        this.saveToStorage()
      }
    },

    // Aggiorna una proprietà arbitraria di un item (es. startTurnPhrase)
    updateItemProperty(sectionKey, itemId, prop, value) {
      const item = this.sections[sectionKey].items?.find(i => i.id === itemId)
      if (item) {
        item[prop] = value
        this.saveToStorage()
      }
    },

    // Aggiorna un'opzione di sezione
    updateOption(sectionKey, optKey, value) {
      if (this.sections[sectionKey]?.options) {
        this.sections[sectionKey].options[optKey] = value
        this.saveToStorage()
      }
    },

    // Ripristina tutte le impostazioni ai valori di default
    resetToDefaults() {
      // Crea un nuovo store temporaneo per ottenere lo stato iniziale
      const defaultStore = useSettingsStore()
      this.sections = JSON.parse(JSON.stringify(defaultStore.$state.sections))
      this.saveToStorage()
    }
  }
})