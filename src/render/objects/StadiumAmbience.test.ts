import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createStadium } from './createStadium';
import { StadiumAmbience } from './StadiumAmbience';

describe('stadium ambience presentation', () => {
  it('changes authored weather identity when the presentation stadium is rebuilt', () => {
    const scene = new THREE.Scene();
    createStadium(scene, 'blood-court');
    const ambience = new StadiumAmbience(scene);

    expect(ambience.weather).toBe('embers');
    expect(scene.getObjectByName('stadium-weather-particles')).toBeInstanceOf(THREE.Points);

    createStadium(scene, 'frostbound-arena');
    ambience.update(1 / 60);
    expect(ambience.weather).toBe('snow');
    ambience.dispose();
    expect(scene.getObjectByName('stadium-ambience')).toBeUndefined();
  });

  it('accepts crowd and phase reactions without mutating match state', () => {
    const scene = new THREE.Scene();
    createStadium(scene, 'royal-amethyst');
    const ambience = new StadiumAmbience(scene);
    const supporter = scene.getObjectByName('stadium-supporter-group')!;
    const supporterBaseY = supporter.position.y;

    ambience.setPhase('bloodMoon');
    ambience.celebrate(1.2);
    ambience.update(0.1);

    expect(ambience.cheerLevel).toBeGreaterThan(1);
    const crowd = scene.getObjectByName('stadium-crowd-bodies') as THREE.InstancedMesh;
    expect(crowd.instanceMatrix.version).toBeGreaterThan(0);
    expect(supporter.position.y).toBeGreaterThan(supporterBaseY);
    ambience.reset();
    expect(ambience.cheerLevel).toBe(0);
  });

  it('fractures stadium-specific props visually and restores them on reset', () => {
    const scene = new THREE.Scene();
    createStadium(scene, 'emerald-cathedral');
    const ambience = new StadiumAmbience(scene);
    const prop = scene.getObjectByName('stadium-reactive-prop')!;
    const piece = prop.children[0]!;
    const initialPosition = piece.position.clone();

    ambience.burstProps(1.4);
    ambience.update(1 / 30);

    expect(ambience.reactivePropDamage).toBeGreaterThan(0.3);
    expect(piece.position.equals(initialPosition)).toBe(false);
    ambience.reset();
    expect(ambience.reactivePropDamage).toBe(0);
    expect(piece.position.equals(initialPosition)).toBe(true);
  });
});
