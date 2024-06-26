<template>

    <section id="hero-element" :class="heroClasses">

    <div id="hero-canvas__container" :class="heroClasses">
  
    <div class="hero-canvas__sidebar" :class="heroClasses">
        <div class="line-numbers">
        <span class="line-number__line" v-once v-for="i in 50"><span v-if="i < 10">0</span>{{ i }}</span>
        </div>
    </div>

    <canvas id="hero-canvas" :class="heroClasses" ref="canvas" :width="width" :height="height"/>

    </div>
    </section>

</template>

<script setup>
import { useRoute } from 'vue-router';
import { useMouse, useWindowSize, useElementVisibility } from '@vueuse/core';
import { onMounted, ref } from 'vue';
import { createShader, createProgram } from '~/shaders/shaderHelpers';
import fragment from '~/shaders/hero/fragment.js';
import vertex from '~/shaders/hero/vertex.js';
import { gsap } from 'gsap';

let gl = null;
let program = null;
let positionBuffer = null;
const locations = {
    time: null,
    resolution: null,
    position: null,
    mouse: null,
    zoomOffset: null,
    initialXOffset: null,
};
let time = 0;
let then = Date.now();

const { width, height } = useWindowSize();
const { x, y } = useMouse();
let outputX = ref(x.value);
let outputY = ref(y.value);
let initialXOffset = ref(1);
const scrollPercentage = useState("scrollPercentage", () => 0);

const focused = useWindowFocus();
const canvas = ref(null);
const canvasIsVisible = useElementVisibility(canvas);

let enableRendering = computed(() => {
    if (focused.value === false) {
        return false;
    }
    if (route.path === '/' || route.path === '/projects') {
      return true;
    }
    return !!(route.path.startsWith('/projects/') && canvasIsVisible.value === true);
});

/**
   * Does the initial work to set up the WebGL context and shaders
   */
   const initWebGLComponent = () => {
  
  // Set up the canvas and WebGL context
  const canvas = document.getElementById('hero-canvas');
  gl = canvas.getContext('webgl');
  if (!gl) {
    return;
  }

  // Create the shaders
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertex);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragment);

  // Create a shader program object to store combined shader program
  program = createProgram(gl, vertexShader, fragmentShader);

  // Prepare the position attribute and buffer
  locations.position = gl.getAttribLocation(program, "position");
  positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const vertices = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0]);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Get the location of the time uniform
  locations.time = gl.getUniformLocation(program, "iTime");

  // Get the location of the resolution uniform
  locations.resolution = gl.getUniformLocation(program, "iResolution");

  // Get the location of the mouse uniform
  locations.mouse = gl.getUniformLocation(program, "iMouse");

  // Get the location of the zoom offset uniform
  locations.zoomOffset = gl.getUniformLocation(program, "iZoomOffset");

  // Get the location of the initial X offset uniform
  locations.initialXOffset = gl.getUniformLocation(program, "iInitialXOffset");

  // Get the location of the portfolio scroll percentage uniform
  locations.scrollPercentage = gl.getUniformLocation(program, "scrollPercentage");

}

/**
 * Updates the WebGL component on every "frame" of the animation.
 */
const renderWebGLComponent = () => {

  if (enableRendering.value === false && time !== 0) {
    requestAnimationFrame(renderWebGLComponent);
    return;
  }

  // Check the frame rate
  let now = Date.now();
  let delta = now - then;

  // Only render if at least 16.67ms (60fps max) has passed
  if (delta > (1000 / 60)) {

    // Set the view port
    gl.viewport(0, 0, width.value, height.value);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Enable the depth test
    gl.enable(gl.DEPTH_TEST);

    // Use the program
    gl.useProgram(program);

    // Handle the position buffer update
    gl.enableVertexAttribArray(locations.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

    // Pass the time uniform
    time++;
    gl.uniform1f(locations.time, time * 0.01);

    // Pass the resolution uniform
    gl.uniform2f(locations.resolution, width.value, height.value);

    // Pass the mouse uniform
    outputX.value += (x.value - outputX.value) * 0.1;
    outputY.value += (y.value - outputY.value) * 0.1;
    gl.uniform2f(locations.mouse, (1 / width.value) * outputX.value, (1 / height.value) * outputY.value);

    // Pass the zoom offset uniform
    gl.uniform1f(locations.zoomOffset, zoomOffset.value);

    // Pass the initial X offset uniform
    gl.uniform1f(locations.initialXOffset, initialXOffset.value);

    // Pass the scroll percentage uniform
    gl.uniform1f(locations.scrollPercentage, scrollPercentage.value);

    // Draw the vertices
    gl.drawArrays(gl.TRIANGLES, 0, 6);

  }

  // Update delta for last frame rate check
  then = Date.now() - (then % (1000 / 60))


  // All done
  requestAnimationFrame(renderWebGLComponent);
}

/**
 * Initialize the WebGL background
 */
onMounted(() => {
  initWebGLComponent();
  requestAnimationFrame(renderWebGLComponent);
  gsap.to(initialXOffset, {
    duration: 7,
    value: 0,
    ease: "power3.out"
  });
});

/**
 * Animate the vertical offset based on the current route.
 * Only the index gets the full hero animation, other routes get the subdued background.
 * @type {*}
 */
const route = useRoute();
let zoomOffset = ref(route.path === '/projects' ? 1 : 0);
watch(route, (route) => {
  if (route["path"] === "/projects") {
    gsap.to(zoomOffset, {
      duration: 6,
      value: 1,
      ease: "power1.out"
    });
  } else {
    gsap.to(zoomOffset, {
      duration: 6,
      value: 0,
      ease: "power1.inOut"
    });
  }
});

/**
 * Determine the CSS classes to apply to the element
 */
const heroClasses = computed(() => {
  return {
    'hero--about': route.path === '/about',
    'hero--contact': route.path === '/contact',
    'hero--portfolio-single': route.path.startsWith('/projects/'),
  }
});

</script>

<style lang="scss" scoped>

body.fixed-webgl {
    #hero-element {
      position: fixed;
      bottom: unset;
    }
  }

#hero-element {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    transition: transform 2s cubic-bezier(0.65, 0, 0.15, 1);
}

  #hero-canvas__container {
  position: relative;
  width: 100%;
  height: 100%;
  transition: all 1.8s cubic-bezier(0.7, 0, 0, 1);
  border-radius: 0;
  box-shadow: transparent 0 0px 20px -10px, transparent 0px 13px 156px -10px;
  object-fit: cover;
  z-index: -1;
  clip-path: polygon(-10% -10%, 110% -10%, 110% 110%, -10% 110%);
  background-color: #030205;
  }

  #hero-canvas {
  position: relative;
  width: 100%;
  height: 100%;
}

.hero-canvas__sidebar {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 220px;
  background-color: #E6ECF3;
  height: 100%;
  z-index: 2;
  transition: transform 2s cubic-bezier(0.65, 0, 0.15, 1);
  transform: translateX(-100%);
  padding: 20px;

  .line-numbers {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 15px;
  opacity: 0.8;
}

.icon-pop-enter-active,
.icon-pop-leave-active {
  transition: all 1s cubic-bezier(0.7, 0, 0, 1);
}

.icon-pop-enter-from, .icon-pop-leave-to {
  opacity: 0;
  transform: scale(0.3);
  }
}
</style>