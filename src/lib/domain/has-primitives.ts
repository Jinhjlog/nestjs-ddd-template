/**
 * 애그리거트/엔티티의 **원시값 투영** 계약 (옵트인).
 *
 * 응답 등으로 원시 표현이 필요한 도메인 모델만 `implements HasPrimitives<P>`로
 * 채택한다. base에 강제하지 않는다 — 모든 모델이 투영을 필요로 하지 않고,
 * 충실한 전체 스냅샷과 안전한 공개 투영(민감필드 제외)은 목적이 다르기 때문.
 *
 * @example
 * class Admin
 *   extends AggregateRoot<AdminProps>
 *   implements HasPrimitives<AdminPrimitives>
 * {
 *   toPrimitives(): AdminPrimitives {
 *     return { id: this.id.toString(), loginId: this.loginId.value, ... };
 *     // password 등 민감필드는 의도적으로 제외
 *   }
 * }
 */
export interface HasPrimitives<P> {
  toPrimitives(): P;
}
