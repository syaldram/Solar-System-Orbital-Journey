import * as THREE from 'three';
import { seededRandom } from './procedural-materials';
import { getRenderingQualityProfile, type RenderingQualityProfile } from './quality-profile';

/** Decorative sky with fixed orientation. No clock, scientific frame or phase. */
export class HeliosphereBackground {
  readonly root = new THREE.Group();
  private readonly band = new THREE.Mesh(
    new THREE.SphereGeometry(2_400, 40, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      vertexShader: `varying vec3 skyDirection;
        void main() {
          skyDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `varying vec3 skyDirection;
        void main() {
          vec3 direction = normalize(skyDirection);
          float latitude = dot(direction, normalize(vec3(-0.58, 0.77, -0.23)));
          float broad = exp(-pow(latitude / 0.16, 2.0));
          float core = exp(-pow(latitude / 0.055, 2.0));
          float clouds = 0.72 + 0.16 * sin(direction.x * 39.0 + sin(direction.z * 27.0))
            + 0.12 * sin(direction.z * 63.0 + direction.y * 41.0);
          float dust = 1.0 - 0.48 * exp(-pow((latitude + 0.012 * sin(direction.x * 31.0)) / 0.018, 2.0));
          vec3 light = vec3(0.001, 0.0015, 0.003) +
            vec3(0.009, 0.011, 0.018) * (broad * 0.6 + core * 0.4) * clouds * dust;
          gl_FragColor = vec4(light, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  private readonly stars: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;

  constructor() {
    const random = seededRandom(15_102_026);
    const capacity = getRenderingQualityProfile('high').heliosphereStarCount;
    const positions = new Float32Array(capacity * 3);
    for (let index = 0; index < capacity; index += 1) {
      const azimuth = random() * Math.PI * 2;
      const vertical = random() * 2 - 1;
      const horizontal = Math.sqrt(1 - vertical * vertical);
      positions.set([2_200 * horizontal * Math.cos(azimuth), 2_200 * vertical, 2_200 * horizontal * Math.sin(azimuth)], index * 3);
    }
    this.stars = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3)),
      new THREE.PointsMaterial({ color: 0x485063, size: 1.25, sizeAttenuation: false, depthTest: false, depthWrite: false }),
    );
    this.root.name = 'heliosphere-background';
    this.band.name = 'heliosphere-milky-way-band';
    this.stars.name = 'heliosphere-distant-stars';
    this.band.renderOrder = -1_000;
    this.stars.renderOrder = -999;
    this.root.add(this.band, this.stars);
    this.root.visible = false;
  }

  setDensity(quality: RenderingQualityProfile, viewportWidth: number): void {
    // Matches the existing phone layout, independently of device pixel ratio.
    this.stars.geometry.setDrawRange(0, Math.floor(quality.heliosphereStarCount * (viewportWidth <= 700 ? 0.45 : 1)));
  }

  placeAroundCamera(position: THREE.Vector3): void {
    // Translation only: manual orbit/pan changes projection, never sky orientation.
    // Both opaque, depth-free draws precede all local artwork, even at max zoom.
    this.root.position.copy(position);
  }

  dispose(): void {
    this.band.geometry.dispose();
    this.band.material.dispose();
    this.stars.geometry.dispose();
    this.stars.material.dispose();
    this.root.clear();
    this.root.removeFromParent();
  }
}
