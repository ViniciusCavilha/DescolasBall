import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONFIG } from '../src/config/gameConfig.ts';
import { Ball } from '../src/entities/Ball.ts';
import { detectCircleCollision, resolveCircleSegmentCollision, resolvePlayerBallCollision } from '../src/core/collision.ts';
import { Vector2 } from '../src/core/math/Vector2.ts';
import { canViewFacingIndicator } from '../src/core/playerVisibility.ts';

describe('nova escala do Player', () => {
  test('hitbox é menor e continua proporcional à Ball', () => {
    assert.equal(GAME_CONFIG.player.radius, 25);
    assert.equal(GAME_CONFIG.ball.radius, 18);
    assert.ok(GAME_CONFIG.player.radius > GAME_CONFIG.ball.radius);
    assert.ok(GAME_CONFIG.player.radius / GAME_CONFIG.ball.radius < 1.5);
  });

  test('colisão separa Player e Ball sem sobreposição ou jitter', () => {
    const player = { position: Vector2.ZERO, velocity: new Vector2(100, 0), radius: 25 };
    const ball = { position: new Vector2(40, 0), velocity: Vector2.ZERO, radius: 18 };
    const collision = detectCircleCollision(player, ball);
    assert.ok(collision);
    const result = resolvePlayerBallCollision(player, ball, collision, 0.35, 0.08, 1800);
    assert.equal(result.position.x, 43);
    assert.ok(result.velocity.x > 0 && result.velocity.x <= 1800);
  });

  test('Ball que atinge Player parado ricocheteia em vez de morrer', () => {
    const player = { position: Vector2.ZERO, velocity: Vector2.ZERO, radius: 25 };
    const ball = { position: new Vector2(42, 0), velocity: new Vector2(-1000, 0), radius: 18 };
    const collision = detectCircleCollision(player, ball);
    assert.ok(collision);
    const result = resolvePlayerBallCollision(player, ball, collision, 0.35, 0.08, 1800);
    assert.equal(result.velocity.x, 350);
  });

  test('Player empurra a Ball com resposta clara e limitada', () => {
    const player = { position: Vector2.ZERO, velocity: new Vector2(310, 0), radius: 25 };
    const ball = { position: new Vector2(42, 0), velocity: Vector2.ZERO, radius: 18 };
    const collision = detectCircleCollision(player, ball);
    assert.ok(collision);
    const result = resolvePlayerBallCollision(player, ball, collision, 0.35, 0.08, 1800);
    assert.ok(result.velocity.x > player.velocity.x);
    assert.ok(result.velocity.magnitude() <= 1800);
  });
});

describe('visibilidade do indicador', () => {
  test('é sempre visível para o jogador local', () => {
    assert.equal(canViewFacingIndicator('TEAM_A', 'TEAM_B', true), true);
  });
  test('é visível para companheiros', () => {
    assert.equal(canViewFacingIndicator('TEAM_A', 'TEAM_A', false), true);
  });
  test('é oculto para adversários e espectadores', () => {
    assert.equal(canViewFacingIndicator('TEAM_A', 'TEAM_B', false), false);
    assert.equal(canViewFacingIndicator('SPECTATOR', 'TEAM_A', false), false);
  });
});

describe('ricochete preservado', () => {
  const restitution = GAME_CONFIG.field.wallRestitution;
  test('parede vertical reflete X e preserva o componente tangencial', () => {
    const result = resolveCircleSegmentCollision(
      { position: new Vector2(95, 100), velocity: new Vector2(300, 100), radius: 18 },
      new Vector2(100, 0), new Vector2(100, 200), restitution,
    );
    assert.equal(result.collided, true);
    assert.equal(result.position.x, 82);
    assert.ok(result.velocity.x < 0);
    assert.equal(result.velocity.y, 100);
  });

  test('parede horizontal reflete Y', () => {
    const result = resolveCircleSegmentCollision(
      { position: new Vector2(100, 95), velocity: new Vector2(100, 300), radius: 18 },
      new Vector2(0, 100), new Vector2(200, 100), restitution,
    );
    assert.ok(result.velocity.y < 0);
    assert.equal(result.velocity.x, 100);
  });

  test('parede diagonal reflete em ângulo previsível', () => {
    const result = resolveCircleSegmentCollision(
      { position: new Vector2(50, 50), velocity: new Vector2(100, -100), radius: 18 },
      new Vector2(0, 0), new Vector2(100, 100), restitution,
    );
    assert.ok(result.velocity.x < 0 && result.velocity.y > 0);
  });

  test('Power Shot ricocheteia e permanece abaixo do limite máximo', () => {
    const result = resolveCircleSegmentCollision(
      { position: new Vector2(95, 100), velocity: new Vector2(1800, 0), radius: 18 },
      new Vector2(100, 0), new Vector2(100, 200), restitution,
    );
    assert.ok(result.velocity.x < 0);
    assert.ok(result.velocity.magnitude() <= 1800);
  });

  test('Power Shot rente à parede volta para o campo em vez de desaparecer', () => {
    const result = resolveCircleSegmentCollision(
      { position: new Vector2(50, -18), velocity: new Vector2(0, -1800), radius: 18 },
      new Vector2(0, 0),
      new Vector2(100, 0),
      restitution,
      new Vector2(50, 18),
    );
    assert.equal(result.collided, true);
    assert.deepEqual(result.position, new Vector2(50, 18));
    assert.ok(result.velocity.y > 0);
    assert.ok(result.velocity.magnitude() <= 1800);
  });

  test('duas paredes expulsam a Ball do canto', () => {
    let ball = { position: new Vector2(95, 95), velocity: new Vector2(300, 300), radius: 18 };
    const vertical = resolveCircleSegmentCollision(ball, new Vector2(100, 0), new Vector2(100, 100), restitution);
    ball = { ...ball, position: vertical.position, velocity: vertical.velocity };
    const horizontal = resolveCircleSegmentCollision(ball, new Vector2(0, 100), new Vector2(100, 100), restitution);
    assert.ok(horizontal.position.x <= 82 && horizontal.position.y <= 82);
    assert.ok(horizontal.velocity.x < 0 && horizontal.velocity.y < 0);
  });

  test('drag desacelera gradualmente sem parar instantaneamente', () => {
    const ball = new Ball(Vector2.ZERO, new Vector2(680, 0));
    ball.update(1 / 60);
    assert.ok(ball.velocity.x > 0 && ball.velocity.x < 680);
  });
});
