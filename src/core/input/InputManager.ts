export type InputAction =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight';

const ACTION_BINDINGS: Readonly<Record<InputAction, readonly string[]>> = {
  moveUp: ['KeyW', 'ArrowUp'],
  moveDown: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
};

const MOVEMENT_KEYS = new Set(Object.values(ACTION_BINDINGS).flat());

export class InputManager {
  private readonly pressedKeys = new Set<string>();

  public constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.clearPressedKeys);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  public isActionActive(action: InputAction): boolean {
    return ACTION_BINDINGS[action].some((key) => this.pressedKeys.has(key));
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.clearPressedKeys);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.clearPressedKeys();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!MOVEMENT_KEYS.has(event.code)) {
      return;
    }

    event.preventDefault();
    this.pressedKeys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (!MOVEMENT_KEYS.has(event.code)) {
      return;
    }

    event.preventDefault();
    this.pressedKeys.delete(event.code);
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.clearPressedKeys();
    }
  };

  private readonly clearPressedKeys = (): void => {
    this.pressedKeys.clear();
  };
}
