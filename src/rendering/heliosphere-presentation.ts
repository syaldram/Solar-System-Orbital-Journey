import * as THREE from 'three';
import { HELIOPAUSE_RADIUS, TERMINATION_SHOCK_RADIUS } from './heliosphere-mapping';

/** Static, open upper hemisphere: the long negative-X side is an illustrative tail. */
export class HeliospherePresentation {
  readonly root = new THREE.Group();
  constructor() {
    for (const [radius, color, opacity] of [
      [HELIOPAUSE_RADIUS, 0x398be8, 0.15],
      [128, 0x2871b0, 0.09],
      [TERMINATION_SHOCK_RADIUS, 0x72d4ff, 0.19],
    ] as const) {
      const geometry = new THREE.SphereGeometry(radius, 80, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      const position = geometry.getAttribute('position');
      for (let i = 0; i < position.count; i += 1) {
        position.setX(i, position.getX(i) * (position.getX(i) < 0 ? 2.5 : 1));
        position.setY(i, position.getY(i) * 0.85);
      }
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      this.root.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, opacity, transparent: true, side: THREE.DoubleSide, depthWrite: false })));
      const points = Array.from({ length: 161 }, (_, i) => {
        const angle = i / 160 * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        return new THREE.Vector3(x * (x < 0 ? 2.5 : 1), 0, Math.sin(angle) * radius);
      });
      this.root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, opacity: 0.65, transparent: true })));
    }
    this.root.visible = false;
  }
  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.root.clear();
  }
}
