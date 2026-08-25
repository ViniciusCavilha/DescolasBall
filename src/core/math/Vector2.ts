export class Vector2 {
  public static readonly ZERO = new Vector2(0, 0);

  public constructor(
    public readonly x: number,
    public readonly y: number,
  ) {}

  public add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  public subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  public scale(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  public magnitude(): number {
    return Math.hypot(this.x, this.y);
  }

  public dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  public isFinite(): boolean {
    return Number.isFinite(this.x) && Number.isFinite(this.y);
  }

  public normalize(): Vector2 {
    const length = this.magnitude();
    return length > 0 && Number.isFinite(length)
      ? this.scale(1 / length)
      : Vector2.ZERO;
  }

  public clampMagnitude(maximum: number): Vector2 {
    if (!this.isFinite() || !Number.isFinite(maximum) || maximum <= 0) {
      return Vector2.ZERO;
    }

    const length = this.magnitude();
    return length > maximum ? this.scale(maximum / length) : this;
  }
}
