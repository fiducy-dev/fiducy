import { Mesh, NoBlending, OrthographicCamera, PlaneGeometry, SRGBColorSpace, Scene } from 'three';
import { ShaderMaterial, Vector2, WebGLRenderTarget } from 'three';

import type { PixelPass } from '@/types';
import type { WebGLRenderer } from 'three';

const VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform sampler2D scene;
uniform vec2 resolution;
uniform vec2 pointer;
uniform float strength;
uniform float radius;
uniform float pixelRatio;
uniform float time;
varying vec2 vUv;

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
}

float ink(vec4 texel) {
  if (texel.a < 0.01) return 0.0;
  vec3 color = texel.rgb / texel.a;
  return texel.a * (1.0 - dot(color, vec3(0.299, 0.587, 0.114)));
}

vec4 darkest(vec2 corner, float size) {
  vec4 best = vec4(0.0);
  float bestInk = 0.0;
  for (int y = 0; y < 4; y++) {
    for (int x = 0; x < 4; x++) {
      vec2 offset = (vec2(float(x), float(y)) + 0.5) * size / 4.0;
      vec4 texel = texture2D(scene, (corner + offset) / resolution);
      float amount = ink(texel);
      if (amount > bestInk) {
        bestInk = amount;
        best = texel;
      }
    }
  }
  return best;
}

void main() {
  vec2 fragment = gl_FragCoord.xy;
  float falloff = 1.0 - smoothstep(0.0, radius, distance(fragment, pointer));
  float influence = strength * falloff;
  if (influence < 0.03) {
    gl_FragColor = texture2D(scene, vUv);
  } else {
    float size = max(2.0, floor(mix(2.0, 14.0, influence))) * pixelRatio;
    vec2 cell = floor(fragment / size);
    float noise = hash(cell + floor(time * 14.0));
    vec2 center = (cell + 0.5) * size;
    vec2 away = normalize(center - pointer + 0.001);
    vec2 source = cell * size - away * influence * noise * 26.0 * pixelRatio;
    vec4 texel = darkest(source, size);
    float amount = ink(texel);
    vec4 pixel = amount > 0.55 ? vec4(0.0, 0.0, 0.0, 1.0) : amount > 0.12 ? vec4(vec3(0.54), 1.0) : texel;
    gl_FragColor = noise < influence * 0.5 ? vec4(0.0) : pixel;
  }
  #include <colorspace_fragment>
}
`;

export function createPixelPass(renderer: WebGLRenderer): PixelPass {
  const target = new WebGLRenderTarget(1, 1, { samples: 4, colorSpace: SRGBColorSpace });
  const resolution = new Vector2();
  const material = new ShaderMaterial({
    uniforms: {
      scene: { value: target.texture },
      resolution: { value: resolution },
      pointer: { value: new Vector2() },
      strength: { value: 0 },
      radius: { value: 1 },
      pixelRatio: { value: 1 },
      time: { value: 0 }
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    blending: NoBlending,
    depthTest: false,
    depthWrite: false
  });
  const quadScene = new Scene();
  const quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new PlaneGeometry(2, 2);
  quadScene.add(new Mesh(geometry, material));

  return {
    resize() {
      renderer.getDrawingBufferSize(resolution);
      target.setSize(resolution.x, resolution.y);
    },
    render(scene, camera, effect) {
      const ratio = renderer.getPixelRatio();
      const { uniforms } = material;
      uniforms.pointer?.value.set(effect.x * ratio, effect.y * ratio);
      if (uniforms.strength) uniforms.strength.value = effect.strength;
      if (uniforms.radius) uniforms.radius.value = effect.radius * ratio;
      if (uniforms.pixelRatio) uniforms.pixelRatio.value = ratio;
      if (uniforms.time) uniforms.time.value = performance.now() / 1000;
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCamera);
    },
    dispose() {
      target.dispose();
      material.dispose();
      geometry.dispose();
    }
  };
}
