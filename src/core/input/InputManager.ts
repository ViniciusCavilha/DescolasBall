import type { NetworkInput } from '../../shared/network';

export type InputAction =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'kick'
  | 'restartMatch'
  | 'toggleMenu'
  | 'closeMenu';

const ACTION_BINDINGS: Readonly<Record<InputAction, readonly string[]>> = {
  moveUp: ['KeyW', 'ArrowUp'],
  moveDown: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  kick: ['Space'],
  restartMatch: ['KeyR'],
  toggleMenu: ['Tab'],
  closeMenu: ['Escape'],
};

const MANAGED_KEYS = new Set(Object.values(ACTION_BINDINGS).flat());

export class InputManager {
  private readonly pressedKeys = new Set<string>();
  private readonly pressedActions = new Set<InputAction>();
  private readonly releasedActions = new Set<InputAction>();

  public constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.clearPressedKeys);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  public isActionActive(action: InputAction): boolean {
    return ACTION_BINDINGS[action].some((key) => this.pressedKeys.has(key));
  }

  public consumeActionPress(action: InputAction): boolean {
    const wasPressed = this.pressedActions.has(action);
    this.pressedActions.delete(action);
    return wasPressed;
  }

  public consumeActionRelease(action: InputAction): boolean {
    const wasReleased = this.releasedActions.has(action);
    this.releasedActions.delete(action);
    return wasReleased;
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.clearPressedKeys);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.clearPressedKeys();
  }

  public clearGameplayInput(): void {
    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']) {
      this.pressedKeys.delete(code);
    }
    this.pressedActions.delete('kick');
    this.releasedActions.delete('kick');
  }

  public createNetworkInput(sequence: number, gameplayEnabled = true): NetworkInput {
    return {
      sequence,
      up: gameplayEnabled && this.isActionActive('moveUp'),
      down: gameplayEnabled && this.isActionActive('moveDown'),
      left: gameplayEnabled && this.isActionActive('moveLeft'),
      right: gameplayEnabled && this.isActionActive('moveRight'),
      kick: gameplayEnabled && this.isActionActive('kick'),
    };
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!MANAGED_KEYS.has(event.code)) {
      return;
    }

    event.preventDefault();
    const action = this.findAction(event.code);
    if (!this.pressedKeys.has(event.code) && action) {
      this.pressedActions.add(action);
    }
    this.pressedKeys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (!MANAGED_KEYS.has(event.code)) {
      return;
    }

    event.preventDefault();
    const action = this.findAction(event.code);
    if (this.pressedKeys.has(event.code) && action) {
      this.releasedActions.add(action);
    }
    this.pressedKeys.delete(event.code);
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.clearPressedKeys();
    }
  };

  private readonly clearPressedKeys = (): void => {
    this.pressedKeys.clear();
    this.pressedActions.clear();
    this.releasedActions.clear();
  };

  private findAction(key: string): InputAction | null {
    const action = (Object.keys(ACTION_BINDINGS) as InputAction[])
      .find((candidate) => ACTION_BINDINGS[candidate].includes(key));
    return action ?? null;
  }
}
