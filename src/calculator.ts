/**
 * Calculator class providing basic arithmetic operations
 */
export class Calculator {
  /**
   * Add two numbers
   * @param a - First number
   * @param b - Second number
   * @returns Sum of a and b
   */
  add(a: number, b: number): number {
    return a + b;
  }

  /**
   * Subtract b from a
   * @param a - First number
   * @param b - Second number
   * @returns Difference of a and b
   */
  subtract(a: number, b: number): number {
    return a - b;
  }

  /**
   * Multiply two numbers
   * @param a - First number
   * @param b - Second number
   * @returns Product of a and b
   */
  multiply(a: number, b: number): number {
    return a * b;
  }

  /**
   * Divide a by b
   * @param a - Dividend
   * @param b - Divisor
   * @returns Quotient of a divided by b
   * @throws Error if b is zero
   */
  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero is not allowed');
    }
    return a / b;
  }
}
