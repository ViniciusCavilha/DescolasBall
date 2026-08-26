import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Ball } from '../src/entities/Ball.ts';
import { Player } from '../src/entities/Player.ts';
import type { InputAction, InputManager } from '../src/core/input/InputManager.ts';
import { applyKick, isInsideKickCone } from '../src/core/kick.ts';
import { Vector2 } from '../src/core/math/Vector2.ts';

const RANGE = 82;
const HALF_ANGLE = 55;
const FORCE = 680;
const VELOCITY_RETENTION = 0.35;
const MAXIMUM_SPEED = 1800;

function playerStub(facingDirection: Vector2): Player {
  return {
    position: Vector2.ZERO,
    velocity: Vector2.ZERO,
    facingDirection,
    radius: 25,
  } as Player;
}

function kick(facing: Vector2, ballPosition: Vector2, multiplier = 1) {
  return applyKick(
    playerStub(facing),
    new Ball(ballPosition, Vector2.ZERO),
    RANGE,
    HALF_ANGLE,
    FORCE * multiplier,
    VELOCITY_RETENTION,
    MAXIMUM_SPEED,
  );
}

describe('direcionamento do chute', () => {
  const cases = [
    ['direita', new Vector2(1, 0), new Vector2(70, 0)],
    ['esquerda', new Vector2(-1, 0), new Vector2(-70, 0)],
    ['cima', new Vector2(0, -1), new Vector2(0, -70)],
    ['baixo', new Vector2(0, 1), new Vector2(0, 70)],
    ['diagonal', new Vector2(1, -1), new Vector2(50, -50)],
  ] as const;

  for (const [name, facing, position] of cases) test(name, () => {
    const result = kick(facing, position);
    assert.ok(result);
    assert.ok(result.velocity.normalize().dot(facing.normalize()) > 0.999999);
  });

  test('aceita uma bola ligeiramente fora do eixo', () => {
    assert.equal(isInsideKickCone(new Vector2(70, 35), new Vector2(1, 0), RANGE, HALF_ANGLE), true);
  });

  test('rejeita uma bola atrás do jogador', () => {
    assert.equal(kick(new Vector2(1, 0), new Vector2(-60, 0)), null);
  });

  test('rejeita uma bola além do alcance', () => {
    assert.equal(kick(new Vector2(1, 0), new Vector2(101, 0)), null);
  });

  test('power shot usa a direção atual e limita a velocidade máxima', () => {
    const result = kick(new Vector2(0, 1), new Vector2(0, 70), 3);
    assert.ok(result);
    assert.deepEqual(result.velocity, new Vector2(0, MAXIMUM_SPEED));
  });
});

describe('facingDirection do jogador', () => {
  test('responde ao input, normaliza diagonais e preserva a última direção parado', () => {
    const active = new Set<InputAction>(['moveRight']);
    const input = {
      isActionActive: (action: InputAction) => active.has(action),
    } as unknown as InputManager;
    const subject = new Player(Vector2.ZERO, input);
    subject.update(1 / 60);
    assert.deepEqual(subject.facingDirection, new Vector2(1, 0));
    active.clear();
    subject.update(1 / 60);
    assert.deepEqual(subject.facingDirection, new Vector2(1, 0));
    active.add('moveUp'); active.add('moveRight');
    subject.update(1 / 60);
    assert.ok(Math.abs(subject.facingDirection.magnitude() - 1) < 1e-12);
    assert.ok(subject.facingDirection.x > 0 && subject.facingDirection.y < 0);
  });

  test('power shot usa a direção alterada durante o carregamento', () => {
    const active = new Set<InputAction>(['moveRight']);
    const input = { isActionActive: (action: InputAction) => active.has(action) } as unknown as InputManager;
    const subject = new Player(Vector2.ZERO, input);
    subject.startKickCharge();
    subject.update(2);
    active.clear(); active.add('moveDown');
    subject.update(1 / 60);
    const multiplier = subject.releaseKickCharge();
    assert.equal(multiplier, 3);
    const ball = new Ball(
      subject.position.add(new Vector2(0, 70)),
      Vector2.ZERO,
    );
    const result = applyKick(subject, ball, RANGE, HALF_ANGLE, FORCE * multiplier, VELOCITY_RETENTION, MAXIMUM_SPEED);
    assert.ok(result);
    assert.deepEqual(result.velocity, new Vector2(0, MAXIMUM_SPEED));
  });

  test('preserva parte controlada da velocidade existente da bola', () => {
    const ball = new Ball(new Vector2(60, 0), new Vector2(0, 200));
    const result = applyKick(playerStub(new Vector2(1, 0)), ball, RANGE, HALF_ANGLE, FORCE, VELOCITY_RETENTION, MAXIMUM_SPEED);
    assert.ok(result);
    assert.deepEqual(result.velocity, new Vector2(FORCE, 70));
  });

  test('velocidade contrária não cancela o impulso do chute', () => {
    const ball = new Ball(new Vector2(60, 0), new Vector2(-1000, 0));
    const result = applyKick(playerStub(new Vector2(1, 0)), ball, RANGE, HALF_ANGLE, FORCE, VELOCITY_RETENTION, MAXIMUM_SPEED);
    assert.ok(result);
    assert.deepEqual(result.velocity, new Vector2(FORCE, 0));
  });
});
