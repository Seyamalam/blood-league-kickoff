import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createStadium } from './createStadium';
import { GOAL_HEIGHT, PITCH_LENGTH, PITCH_WIDTH } from '../../game/field';

describe('stadium readability geometry', () => {
  it('provides the pitch landmarks and unobtrusive arena boards needed for navigation', () => {
    const scene = new THREE.Scene();
    createStadium(scene);

    expect(scene.getObjectByName('stadium-pitch')).toBeInstanceOf(THREE.Mesh);
    expect(scene.getObjectByName('pitch-boundary')).toBeInstanceOf(THREE.Line);
    expect(scene.getObjectByName('pitch-center-circle')).toBeInstanceOf(THREE.LineLoop);
    expect(scene.getObjectByName('pitch-guide-lines')).toBeInstanceOf(THREE.LineSegments);
    const pitch = scene.getObjectByName('stadium-pitch') as THREE.Mesh<THREE.PlaneGeometry>;
    expect(pitch.geometry.parameters.width).toBe(PITCH_WIDTH);
    expect(pitch.geometry.parameters.height).toBe(PITCH_LENGTH);
    expect(PITCH_LENGTH).toBeGreaterThan(PITCH_WIDTH);

    const boards = scene
      .getObjectByName('stadium-environment')!
      .children.filter((object) => object.name === 'arena-board');
    expect(boards).toHaveLength(4);
    for (const board of boards) {
      expect(board).toBeInstanceOf(THREE.Mesh);
      const height = (board as THREE.Mesh<THREE.BoxGeometry>).geometry.parameters.height as number;
      expect(height).toBeLessThanOrEqual(1.35);
    }
  });

  it('makes both goals spatially legible with depth, nets, and mouth markers', () => {
    const scene = new THREE.Scene();
    createStadium(scene);

    for (const name of ['opponent-goal', 'home-goal']) {
      const goal = scene.getObjectByName(name);
      expect(goal).toBeInstanceOf(THREE.Group);
      expect(goal?.getObjectByName('goal-net')).toBeInstanceOf(THREE.LineSegments);
      expect(goal?.getObjectByName('goal-mouth-marker')).toBeInstanceOf(THREE.Mesh);
      expect(goal?.children.length).toBeGreaterThanOrEqual(9);
      expect(goal?.children.some((child) => Math.abs(child.position.y - GOAL_HEIGHT) < 0.001)).toBe(true);
    }
  });

  it('uses instancing for the crowd and keeps decorative lighting shadow-free', () => {
    const scene = new THREE.Scene();
    createStadium(scene);

    const bodies = scene.getObjectByName('stadium-crowd-bodies');
    const heads = scene.getObjectByName('stadium-crowd-heads');
    expect(bodies).toBeInstanceOf(THREE.InstancedMesh);
    expect(heads).toBeInstanceOf(THREE.InstancedMesh);
    expect((bodies as THREE.InstancedMesh).count).toBe(228);
    expect((heads as THREE.InstancedMesh).count).toBe(228);
    expect((bodies as THREE.InstancedMesh).instanceColor).not.toBeNull();
    expect((heads as THREE.InstancedMesh).instanceColor).not.toBeNull();

    const rails = scene
      .getObjectByName('stadium-environment')!
      .children.filter((object) => object.name === 'arena-light-rail');
    expect(rails).toHaveLength(4);
    expect(rails.every((rail) => !rail.castShadow)).toBe(true);
    expect(scene.getObjectByName('arena-upper-fence')).toBeInstanceOf(THREE.LineSegments);
    expect(
      scene.getObjectByName('stadium-environment')?.getObjectByName('stadium-floodlight-rig'),
    ).toBeInstanceOf(THREE.Group);
    expect(
      scene.getObjectByName('stadium-environment')?.getObjectByName('stadium-corner-flag'),
    ).toBeInstanceOf(THREE.Mesh);
    const props = scene
      .getObjectByName('stadium-environment')!
      .children.filter((object) => object.name === 'stadium-reactive-prop');
    expect(props).toHaveLength(4);
    expect(props.every((prop) => prop.children.length >= 2)).toBe(true);
  });

  it('builds distinct architecture and replaces the previous stadium cleanly', () => {
    const scene = new THREE.Scene();
    const first = createStadium(scene, 'emerald-cathedral');
    expect(first.userData).toMatchObject({ variantId: 'emerald-cathedral', architecture: 'cathedral' });
    expect(first.getObjectByName('stadium-architecture-cathedral')).toBeInstanceOf(THREE.Group);

    const second = createStadium(scene, 'frostbound-arena');
    expect(scene.children.filter((child) => child.name === 'stadium-environment')).toEqual([second]);
    expect(first.parent).toBeNull();
    expect(second.getObjectByName('stadium-architecture-fortress')).toBeInstanceOf(THREE.Group);
    expect(second.getObjectByName('stadium-reactive-prop')?.userData.propKind).toBe('fortress');
  });
});
