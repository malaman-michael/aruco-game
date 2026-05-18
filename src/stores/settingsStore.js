import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // Sezioni con items (riordinabili, rinominabili, mute) + opzioni extra
    sections: {
      // ---------- GENERALE (nuova sezione) ----------
      general: {
        title: '⚙️ Generale',
        items: [], // non ci sono voci mute/riordino per questa sezione
        options: {
          language: 'it',           // 'it', 'en'
          voiceRate: 1.0,          // 0.5 - 2.0
          voiceVolume: 1.0,        // 0.0 - 1.0
          voicePitch: 1.0,         // 0.5 - 2.0
          narrativeMode: 'dettagliata', // 'dettagliata', 'sintetica'
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
          announceRemainingHp: 'sempre' // 'sempre', 'sotto30', 'mai'
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
          announceDiceRolls: 'sempre', // 'sempre', 'soloSuccessi', 'mai'
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
          revealCardName: 'sempre', // 'sempre', 'soloIdentificata', 'mai'
          goldPhrase: 'Trovi {amount} monete d’oro!',
          magicItemPhrase: 'Ottieni {itemName}',
          trapPhrase: 'Scatta una trappola! Subisci {damage} danni',
          playTreasureSound: true
        }
      },
      // ---------- SISTEMA (messaggi tecnici) ----------
      system: {
        title: '🔧 Sistema',
        items: [], // non riordinabili
        options: {
          assistantActivatedMsg: 'Assistente vocale attivato.',
          confirmPlacementMsg: 'Pezzo posizionato',
          skipMsg: 'Saltato',
          errorNoMapMsg: 'Nessuna mappa selezionata',
          promptCommandMsg: 'Premi spazio per confermare',
          completionMsg: 'Hai posizionato tutti i pezzi. Buon divertimento!'
        }
      }
    }
  }),

  getters: {
    getSection: (state) => (sectionKey) => state.sections[sectionKey] || null,
    // Comodo per ottenere tutte le impostazioni di una sezione
    getSectionOptions: (state) => (sectionKey) => state.sections[sectionKey]?.options || {}
  },

  actions: {
    loadFromStorage() {
      const saved = localStorage.getItem('gameSettings')
      if (saved) {
        try {
          const data = JSON.parse(saved)
          for (const sectionKey in this.sections) {
            if (data.sections?.[sectionKey]) {
              // Merge items e options
              const savedSection = data.sections[sectionKey]
              if (savedSection.items && this.sections[sectionKey].items) {
                // Aggiorna solo gli item esistenti (stessa id) per preservare le nuove proprietà
                for (let i = 0; i < savedSection.items.length; i++) {
                  const savedItem = savedSection.items[i]
                  const targetItem = this.sections[sectionKey].items.find(it => it.id === savedItem.id)
                  if (targetItem) {
                    Object.assign(targetItem, savedItem)
                  }
                }
              }
              if (savedSection.options) {
                Object.assign(this.sections[sectionKey].options, savedSection.options)
              }
            }
          }
        } catch (e) { console.error(e) }
      }
    },

    saveToStorage() {
      localStorage.setItem('gameSettings', JSON.stringify({
        sections: this.sections
      }))
    },

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

    updateItemName(sectionKey, itemId, newName) {
      const item = this.sections[sectionKey].items?.find(i => i.id === itemId)
      if (item) {
        item.name = newName
        this.saveToStorage()
      }
    },

    toggleMute(sectionKey, itemId) {
      const item = this.sections[sectionKey].items?.find(i => i.id === itemId)
      if (item) {
        item.muted = !item.muted
        this.saveToStorage()
      }
    },

    // Nuovo: aggiorna un'opzione generica
    updateOption(sectionKey, optionKey, value) {
      if (this.sections[sectionKey]?.options) {
        this.sections[sectionKey].options[optionKey] = value
        this.saveToStorage()
      }
    },

    // Aggiorna una proprietà specifica di un item (es. startTurnPhrase)
    updateItemProperty(sectionKey, itemId, prop, value) {
      const item = this.sections[sectionKey].items?.find(i => i.id === itemId)
      if (item) {
        item[prop] = value
        this.saveToStorage()
      }
    },

    resetToDefaults() {
      // Ricostruisci lo stato iniziale (uguale a quello definito in state)
      const defaultStore = useSettingsStore()
      this.sections = JSON.parse(JSON.stringify(defaultStore.$state.sections))
      this.saveToStorage()
    }
  }
})