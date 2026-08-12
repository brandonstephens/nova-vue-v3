<script setup lang="ts" generic="TData extends Record<string, unknown>">
defineProps<{
  item: TData
}>()
</script>

<template data-language="pug">
  <pre>{{ item }}</pre>
</template>

<style lang="stylus" module="styles">
pre
  color #1f2937
</style>
