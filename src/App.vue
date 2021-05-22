<template>
  <div id="app">
    <div v-if="!vrm">
      <button @click="load">VRMモデルを読み込む</button>
    </div>
    <div class="textures" v-else>
      <div v-for="(map, key) in textureMap" :key="key" class="texture">
        <BitmapImg style="width: 128px;height: 128px" :src="map.materials[0].map.image"></BitmapImg>
        <button @click="watch(map.uuid)">ウォッチ</button>
      </div>
    </div>

    <div id="canvas">
    </div>

  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRM } from '@pixiv/three-vrm';
import BitmapImg from "./components/BitmapImg.vue";
import  { readPsd } from 'ag-psd';

function toArrayBuffer(buf:Buffer) {
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; ++i) {
    view[i] = buf[i];
  }
  return ab;
}


export type DataType = {
  vrm:boolean,
  scene:THREE.Scene,
  textures:Array<unknown>,
  renderer:THREE.Renderer,
  camera:THREE.PerspectiveCamera,
  textureMap:Array<{
    materials:Array<unknown>,
    watch:string
    uuid:string,
  }>
}

export default Vue.extend({
  name: 'App',
  components: {
    BitmapImg
  },
  data():DataType {
    return {
      vrm:false,
      scene:new THREE.Scene(),
      textures:[],
      renderer:new THREE.WebGLRenderer({ alpha: true }),
      camera:new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.00001, 30),
      textureMap: []
    }
  },
  mounted() {
    const canvas = this.$el.querySelector('#canvas') as HTMLCanvasElement
    canvas.appendChild(this.renderer.domElement)

    const light = new THREE.AmbientLight(0xffffff);
    light.intensity = 10
    this.scene.add(light);
    this.cameraPos("3")
    new OrbitControls( this.camera, this.renderer.domElement );

    this.resize();
    const render = () => {
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(render);

    };
    render();
    window.addEventListener('resize', this.resize)
    window.addEventListener('keydown',  (event) => {
      this.cameraPos(event.key)
    })
    // @ts-ignore
    window.api.textureUpdateListener((res) => {
      this.replaceTexture(res.key, res.data, res.psd)
    })
  },
  methods: {
    replaceTexture(key:string, data:Uint8Array, psd:boolean){
      const targets = this.textureMap.find(m =>m.uuid == key)?.materials
      const loader = new THREE.TextureLoader()
      const img = (() => {
        if (!psd) {
          // @ts-ignore
          return 'data:image/png;base64,' +btoa(String.fromCharCode.apply(null, new Uint8Array(data)))
        } else {
          console.log('psd')
          return readPsd(data, {skipLayerImageData:true,skipCompositeImageData:false}).canvas!.toDataURL()
        }
      })()
      loader.load(img, (txt) => {
        targets?.map((mat:any) => {
          mat.object.material.map((m:any) => {
            if (m.uuid == mat.uuid) {
              mat.uniforms.map.value = txt
            }
          })
        })
      })

    },
    watch(key:string){
      // @ts-ignore
      window.api.watch(key)
    },
    resize() {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    },
    cameraPos(num: string) {

      switch (num) {
        case '1':
          this.camera.position.x = 1;
          this.camera.position.z = 0;
          this.camera.position.y = 0;
          this.camera.lookAt(0, 0, 0)
          break;
        case '2':
          this.camera.position.x = 0.7071;
          this.camera.position.z = -0.7071;
          this.camera.position.y = 0;
          this.camera.lookAt(0, 0, 0)
          break;
        case '3':
          this.camera.position.x = 0;
          this.camera.position.z = -1;
          this.camera.position.y = 0;
          this.camera.lookAt(0, 0, 0)
          break;
        case '4':
          this.camera.position.x = -0.7071;
          this.camera.position.z = -0.7071;
          this.camera.position.y = 0;
          this.camera.lookAt(0, 0, 0)
          break;
        case '5':
          this.camera.position.x = -0.7071;
          this.camera.position.z = 0.7071;
          this.camera.position.y = 0;
          this.camera.lookAt(0, 0, 0)
          break;
        case '6':
          this.camera.position.x = 0.7071;
          this.camera.position.z = 0.7071;
          this.camera.position.y = 0;
          this.camera.lookAt(0, 0, 0)
          break;
        case '7':
          this.camera.position.x = 0;
          this.camera.position.z = 0;
          this.camera.position.y = 2;
          this.camera.lookAt(0, 0, 0)
          break;
        case '9':
          this.camera.position.x = 0;
          this.camera.position.z = 0;
          this.camera.position.y = -2;
          this.camera.lookAt(0, 0, 0)
          break;
      }
    },
    async load() {
      // @ts-ignore
      const data = window.api.openVrm()

      if (data) {
        const vrmData = toArrayBuffer(data)
        const loader = new GLTFLoader();
        loader.parse(vrmData, '', (gltf) => {
          this.vrm = true;
          VRM.from(gltf).then((vrm) => {

            vrm.scene.position.y = -1
            // add the loaded vrm to the scene
            vrm.scene.traverse((object: any) => {
              if (object.material) {
                if (Array.isArray(object.material)) {
                  object.material.map((mat: any) => {
                    if (mat.map) {
                      mat.object = object
                      const textures = this.textureMap.find(tex => tex.uuid == mat.map.uuid)
                      if (textures) {
                        textures.materials.push(mat)
                      } else {
                        this.textureMap.push({
                          uuid: mat.map.uuid,
                          materials: [mat],
                          watch: '',
                        })
                      }
                    }
                  })
                }
              }
            })
            this.scene.add(vrm.scene);
          });
        })
      }
    }
  }
});
</script>

<style>
  /* CSS */
  body,html {
    padding: 0;
    margin:0;
  }
  #canvas {
    position: absolute;
    top:0;
    left:0;
    z-index: -1;
  }
  .texture {
    width: 128px;
    position: relative;
  }
  .texture button{
    position: absolute;
    left: 0;
    top: 0;
  }
  .textures {
    width: 128px;
    position: absolute;
    top:0;
    overflow-y: scroll;
    overflow-x: hidden;
    left: 0;
    bottom: 0;
  }
</style>
