<template>
  <RouterView />
</template>

<script setup>
import { RouterView } from 'vue-router'
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #0f0f1e;
  color: #eee;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
}
</style>