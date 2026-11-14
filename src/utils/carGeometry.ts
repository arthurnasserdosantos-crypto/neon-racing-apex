import * as THREE from 'three';
import { CarModelId } from './carTuning';

export interface CarGeometrySet {
  centerBody: THREE.BufferGeometry;
  sideFender: THREE.BufferGeometry;
  cabinGlass: THREE.BufferGeometry;
  roofCap: THREE.BufferGeometry;
  rearWingBlade: THREE.BufferGeometry;
  tire: THREE.BufferGeometry;
  rimLip: THREE.BufferGeometry;
  archFlare: THREE.BufferGeometry;
}

/**
 * Builds procedural, beveled sports-car geometries oriented so:
 *  - Forward = -Z
 *  - Rear    = +Z
 *  - Up      = +Y
 *  - Width   = X
 *  - Ground  = Y = 0
 */
export function createCarGeometrySet(modelId: CarModelId = 'starter'): CarGeometrySet {
  // Common performance tire & rim lip
  const tirePoints: THREE.Vector2[] = [
    new THREE.Vector2(0.23, -0.13),
    new THREE.Vector2(0.32, -0.145),
    new THREE.Vector2(0.35, -0.12),
    new THREE.Vector2(0.355, 0.0),
    new THREE.Vector2(0.35, 0.12),
    new THREE.Vector2(0.32, 0.145),
    new THREE.Vector2(0.23, 0.13),
  ];
  const tire = new THREE.LatheGeometry(tirePoints, 28);
  tire.rotateZ(Math.PI / 2);
  tire.computeVertexNormals();

  const rimPoints: THREE.Vector2[] = [
    new THREE.Vector2(0.18, -0.12),
    new THREE.Vector2(0.235, -0.13),
    new THREE.Vector2(0.24, -0.10),
    new THREE.Vector2(0.21, 0.0),
    new THREE.Vector2(0.24, 0.11),
    new THREE.Vector2(0.235, 0.135),
    new THREE.Vector2(0.19, 0.12),
  ];
  const rimLip = new THREE.LatheGeometry(rimPoints, 28);
  rimLip.rotateZ(Math.PI / 2);
  rimLip.computeVertexNormals();

  const archRadius = modelId === 'tuner' ? 0.44 : modelId === 'supercar' ? 0.46 : 0.43;
  const archFlare = new THREE.TorusGeometry(archRadius, 0.03, 8, 20, Math.PI);
  archFlare.rotateY(Math.PI / 2);

  if (modelId === 'tuner') {
    // -------------------------------------------------------------
    // TUNER COUPE: Agile, compact, high-downforce JDM styling
    // -------------------------------------------------------------
    const centerShape = new THREE.Shape();
    centerShape.moveTo(-2.08, 0.24);
    centerShape.lineTo(2.14, 0.18); // Low front splitter
    centerShape.lineTo(2.20, 0.30);
    centerShape.quadraticCurveTo(2.02, 0.52, 1.48, 0.60); // Sloped tuner hood
    centerShape.lineTo(0.82, 0.70);
    centerShape.lineTo(-0.88, 0.78);
    centerShape.lineTo(-1.92, 0.80);
    centerShape.lineTo(-2.12, 0.72);
    centerShape.lineTo(-2.08, 0.24);

    const centerBody = new THREE.ExtrudeGeometry(centerShape, {
      depth: 1.28,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.035,
      bevelSegments: 4,
      curveSegments: 16,
    });
    centerBody.translate(0, 0, -0.64);
    centerBody.rotateY(Math.PI / 2);
    centerBody.computeVertexNormals();

    const sideShape = new THREE.Shape();
    sideShape.moveTo(-2.06, 0.25);
    sideShape.lineTo(-1.80, 0.24);
    sideShape.absarc(-1.35, 0.35, 0.44, Math.PI, 0, true);
    sideShape.lineTo(0.92, 0.20); // Aggressive low side skirts
    sideShape.absarc(1.35, 0.34, 0.42, Math.PI, 0, true);
    sideShape.lineTo(2.12, 0.20);
    sideShape.lineTo(2.18, 0.35);
    sideShape.quadraticCurveTo(1.72, 0.70, 1.32, 0.76);
    sideShape.quadraticCurveTo(0.92, 0.77, 0.52, 0.71);
    sideShape.lineTo(-0.62, 0.74);
    sideShape.quadraticCurveTo(-1.12, 0.88, -1.58, 0.86);
    sideShape.lineTo(-2.08, 0.76);
    sideShape.lineTo(-2.06, 0.25);

    const sideFender = new THREE.ExtrudeGeometry(sideShape, {
      depth: 0.26,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.035,
      bevelSegments: 3,
      curveSegments: 20,
    });
    sideFender.translate(0, 0, -0.13);
    sideFender.rotateY(Math.PI / 2);
    sideFender.computeVertexNormals();

    const glassShape = new THREE.Shape();
    glassShape.moveTo(-1.22, 0.74);
    glassShape.lineTo(0.82, 0.68);
    glassShape.quadraticCurveTo(0.48, 1.04, 0.16, 1.13);
    glassShape.lineTo(-0.54, 1.12);
    glassShape.quadraticCurveTo(-0.94, 0.96, -1.22, 0.74);

    const cabinGlass = new THREE.ExtrudeGeometry(glassShape, {
      depth: 1.20,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.035,
      bevelSegments: 3,
      curveSegments: 16,
    });
    cabinGlass.translate(0, 0, -0.60);
    cabinGlass.rotateY(Math.PI / 2);
    cabinGlass.computeVertexNormals();

    const roofShape = new THREE.Shape();
    roofShape.moveTo(-1.18, 0.76);
    roofShape.lineTo(-0.54, 1.16);
    roofShape.lineTo(0.18, 1.17);
    roofShape.lineTo(0.74, 0.74);
    roofShape.lineTo(0.58, 0.72);
    roofShape.lineTo(0.14, 1.10);
    roofShape.lineTo(-0.50, 1.09);
    roofShape.lineTo(-1.02, 0.74);
    roofShape.lineTo(-1.18, 0.76);

    const roofCap = new THREE.ExtrudeGeometry(roofShape, {
      depth: 1.22,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.025,
      bevelSegments: 3,
    });
    roofCap.translate(0, 0, -0.61);
    roofCap.rotateY(Math.PI / 2);
    roofCap.computeVertexNormals();

    // High-downforce tuner wing
    const wingShape = new THREE.Shape();
    wingShape.moveTo(-0.24, 0.03);
    wingShape.quadraticCurveTo(0.0, 0.09, 0.28, 0.0);
    wingShape.quadraticCurveTo(0.0, 0.025, -0.24, 0.03);

    const rearWingBlade = new THREE.ExtrudeGeometry(wingShape, {
      depth: 1.96,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
    rearWingBlade.translate(0, 0, -0.98);
    rearWingBlade.rotateY(Math.PI / 2);
    rearWingBlade.computeVertexNormals();

    return {
      centerBody,
      sideFender,
      cabinGlass,
      roofCap,
      rearWingBlade,
      tire,
      rimLip,
      archFlare,
    };
  }

  if (modelId === 'supercar') {
    // -------------------------------------------------------------
    // EXOTIC SUPERCAR: Low-slung wedge, mid-engine profile, wide track
    // -------------------------------------------------------------
    const centerShape = new THREE.Shape();
    centerShape.moveTo(-2.24, 0.26);
    centerShape.lineTo(2.22, 0.19); // Low-slung wedge nose
    centerShape.lineTo(2.28, 0.28);
    centerShape.quadraticCurveTo(2.10, 0.48, 1.58, 0.56); // Low raked front
    centerShape.lineTo(0.88, 0.65); // Low cowl
    centerShape.lineTo(-0.95, 0.76); // Mid-engine deck
    centerShape.lineTo(-2.02, 0.79);
    centerShape.lineTo(-2.24, 0.70);
    centerShape.lineTo(-2.24, 0.26);

    const centerBody = new THREE.ExtrudeGeometry(centerShape, {
      depth: 1.42, // Supercar wide stance
      bevelEnabled: true,
      bevelThickness: 0.065,
      bevelSize: 0.045,
      bevelSegments: 4,
      curveSegments: 18,
    });
    centerBody.translate(0, 0, -0.71);
    centerBody.rotateY(Math.PI / 2);
    centerBody.computeVertexNormals();

    const sideShape = new THREE.Shape();
    sideShape.moveTo(-2.22, 0.26);
    sideShape.lineTo(-1.86, 0.24);
    sideShape.absarc(-1.35, 0.36, 0.45, Math.PI, 0, true);
    sideShape.lineTo(0.96, 0.21);
    sideShape.absarc(1.35, 0.35, 0.43, Math.PI, 0, true);
    sideShape.lineTo(2.20, 0.21);
    sideShape.lineTo(2.26, 0.32);
    sideShape.quadraticCurveTo(1.80, 0.66, 1.38, 0.73);
    sideShape.quadraticCurveTo(0.98, 0.74, 0.58, 0.68);
    sideShape.lineTo(-0.68, 0.72);
    sideShape.quadraticCurveTo(-1.20, 0.88, -1.68, 0.87); // Muscular rear haunches
    sideShape.lineTo(-2.22, 0.74);
    sideShape.lineTo(-2.22, 0.26);

    const sideFender = new THREE.ExtrudeGeometry(sideShape, {
      depth: 0.28,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.038,
      bevelSegments: 3,
      curveSegments: 22,
    });
    sideFender.translate(0, 0, -0.14);
    sideFender.rotateY(Math.PI / 2);
    sideFender.computeVertexNormals();

    // Low-slung canopy glass
    const glassShape = new THREE.Shape();
    glassShape.moveTo(-1.32, 0.72);
    glassShape.lineTo(0.88, 0.64);
    glassShape.quadraticCurveTo(0.50, 0.98, 0.16, 1.06); // Sleek windshield
    glassShape.lineTo(-0.58, 1.05);
    glassShape.quadraticCurveTo(-1.00, 0.90, -1.32, 0.72); // Fastback mid-engine louvers

    const cabinGlass = new THREE.ExtrudeGeometry(glassShape, {
      depth: 1.32,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 3,
      curveSegments: 18,
    });
    cabinGlass.translate(0, 0, -0.66);
    cabinGlass.rotateY(Math.PI / 2);
    cabinGlass.computeVertexNormals();

    const roofShape = new THREE.Shape();
    roofShape.moveTo(-1.28, 0.74);
    roofShape.lineTo(-0.58, 1.09);
    roofShape.lineTo(0.18, 1.10);
    roofShape.lineTo(0.78, 0.68);
    roofShape.lineTo(0.62, 0.66);
    roofShape.lineTo(0.14, 1.04);
    roofShape.lineTo(-0.54, 1.03);
    roofShape.lineTo(-1.12, 0.72);
    roofShape.lineTo(-1.28, 0.74);

    const roofCap = new THREE.ExtrudeGeometry(roofShape, {
      depth: 1.34,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.03,
      bevelSegments: 3,
    });
    roofCap.translate(0, 0, -0.67);
    roofCap.rotateY(Math.PI / 2);
    roofCap.computeVertexNormals();

    // Aggressive supercar wing
    const wingShape = new THREE.Shape();
    wingShape.moveTo(-0.20, 0.02);
    wingShape.quadraticCurveTo(0.0, 0.08, 0.26, 0.0);
    wingShape.quadraticCurveTo(0.0, 0.02, -0.20, 0.02);

    const rearWingBlade = new THREE.ExtrudeGeometry(wingShape, {
      depth: 2.08,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
    rearWingBlade.translate(0, 0, -1.04);
    rearWingBlade.rotateY(Math.PI / 2);
    rearWingBlade.computeVertexNormals();

    return {
      centerBody,
      sideFender,
      cabinGlass,
      roofCap,
      rearWingBlade,
      tire,
      rimLip,
      archFlare,
    };
  }

  // -------------------------------------------------------------
  // DEFAULT / STARTER COUPE: Balanced sports coupe
  // -------------------------------------------------------------
  const centerShape = new THREE.Shape();
  centerShape.moveTo(-2.14, 0.26);
  centerShape.lineTo(2.10, 0.22);
  centerShape.lineTo(2.18, 0.34);
  centerShape.quadraticCurveTo(2.05, 0.56, 1.55, 0.64);
  centerShape.lineTo(0.86, 0.73);
  centerShape.lineTo(-0.92, 0.80);
  centerShape.lineTo(-1.95, 0.83);
  centerShape.lineTo(-2.16, 0.74);
  centerShape.lineTo(-2.14, 0.26);

  const centerBody = new THREE.ExtrudeGeometry(centerShape, {
    depth: 1.32,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.04,
    bevelSegments: 4,
    curveSegments: 16,
  });
  centerBody.translate(0, 0, -0.66);
  centerBody.rotateY(Math.PI / 2);
  centerBody.computeVertexNormals();

  const sideShape = new THREE.Shape();
  sideShape.moveTo(-2.10, 0.28);
  sideShape.lineTo(-1.82, 0.26);
  sideShape.absarc(-1.35, 0.36, 0.43, Math.PI, 0, true);
  sideShape.lineTo(0.94, 0.23);
  sideShape.absarc(1.35, 0.35, 0.41, Math.PI, 0, true);
  sideShape.lineTo(2.10, 0.23);
  sideShape.lineTo(2.14, 0.38);
  sideShape.quadraticCurveTo(1.75, 0.72, 1.35, 0.79);
  sideShape.quadraticCurveTo(0.95, 0.80, 0.55, 0.74);
  sideShape.lineTo(-0.65, 0.77);
  sideShape.quadraticCurveTo(-1.15, 0.90, -1.60, 0.88);
  sideShape.lineTo(-2.12, 0.78);
  sideShape.lineTo(-2.10, 0.28);

  const sideFender = new THREE.ExtrudeGeometry(sideShape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 20,
  });
  sideFender.translate(0, 0, -0.12);
  sideFender.rotateY(Math.PI / 2);
  sideFender.computeVertexNormals();

  const glassShape = new THREE.Shape();
  glassShape.moveTo(-1.26, 0.76);
  glassShape.lineTo(0.86, 0.71);
  glassShape.quadraticCurveTo(0.50, 1.06, 0.18, 1.15);
  glassShape.lineTo(-0.56, 1.14);
  glassShape.quadraticCurveTo(-0.96, 0.98, -1.26, 0.76);

  const cabinGlass = new THREE.ExtrudeGeometry(glassShape, {
    depth: 1.24,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 3,
    curveSegments: 16,
  });
  cabinGlass.translate(0, 0, -0.62);
  cabinGlass.rotateY(Math.PI / 2);
  cabinGlass.computeVertexNormals();

  const roofShape = new THREE.Shape();
  roofShape.moveTo(-1.22, 0.78);
  roofShape.lineTo(-0.56, 1.18);
  roofShape.lineTo(0.20, 1.19);
  roofShape.lineTo(0.76, 0.76);
  roofShape.lineTo(0.60, 0.74);
  roofShape.lineTo(0.16, 1.12);
  roofShape.lineTo(-0.52, 1.11);
  roofShape.lineTo(-1.06, 0.76);
  roofShape.lineTo(-1.22, 0.78);

  const roofCap = new THREE.ExtrudeGeometry(roofShape, {
    depth: 1.26,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  roofCap.translate(0, 0, -0.63);
  roofCap.rotateY(Math.PI / 2);
  roofCap.computeVertexNormals();

  const wingShape = new THREE.Shape();
  wingShape.moveTo(-0.18, 0.02);
  wingShape.quadraticCurveTo(0.0, 0.06, 0.22, 0.0);
  wingShape.quadraticCurveTo(0.0, 0.015, -0.18, 0.02);

  const rearWingBlade = new THREE.ExtrudeGeometry(wingShape, {
    depth: 1.86,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  rearWingBlade.translate(0, 0, -0.93);
  rearWingBlade.rotateY(Math.PI / 2);
  rearWingBlade.computeVertexNormals();

  return {
    centerBody,
    sideFender,
    cabinGlass,
    roofCap,
    rearWingBlade,
    tire,
    rimLip,
    archFlare,
  };
}

export function disposeCarGeometrySet(set: CarGeometrySet) {
  set.centerBody.dispose();
  set.sideFender.dispose();
  set.cabinGlass.dispose();
  set.roofCap.dispose();
  set.rearWingBlade.dispose();
  set.tire.dispose();
  set.rimLip.dispose();
  set.archFlare.dispose();
}
