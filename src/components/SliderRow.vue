<template>
  <div class="slider-row">
    <div class="slider-header">
      <span class="slider-label">{{ label }}</span>
      <span class="slider-value">{{ value }}{{ unit }}</span>
    </div>
    <input
      type="range"
      :min="min" :max="max" :step="step"
      :value="value"
      class="slider"
      @input="$emit('update', Number($event.target.value))"
    />
    <span v-if="hint" class="slider-hint">{{ hint }}</span>
  </div>
</template>

<script setup>
defineProps({
  label: String,
  value: Number,
  min:   { type: Number, default: 0 },
  max:   { type: Number, default: 100 },
  step:  { type: Number, default: 1 },
  unit:  { type: String, default: '' },
  hint:  { type: String, default: '' },
})
defineEmits(['update'])
</script>

<style scoped>
.slider-row { padding: 0.5rem 0; border-bottom: 1px solid #2a2a4a; }
.slider-header { display: flex; justify-content: space-between; margin-bottom: 0.3rem; }
.slider-label { font-size: 0.9rem; color: #ccc; }
.slider-value { font-size: 0.9rem; color: #7c9ef5; font-family: monospace; min-width: 48px; text-align: right; }
.slider {
  width: 100%; accent-color: #4a7cf5; height: 4px;
  appearance: none; background: #3a3a6a; border-radius: 2px; outline: none;
}
.slider-hint { font-size: 0.75rem; color: #666; }
</style>