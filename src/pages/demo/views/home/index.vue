<template>
  <div class="home">
    <img
      alt="Vue logo"
      src="./images/logo.png"
    >
    <HelloWorld msg="Hello world" />
  </div>
</template>

<script lang="ts">
import HelloWorld from './components/hello-world.vue'

export default {
  name: 'Home',
  components: {
    HelloWorld,
  },
  setup (): void {
    console.log(process.env.NODE_ENV)
  },
}
</script>
