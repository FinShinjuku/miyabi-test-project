import { Calculator } from './calculator';

describe('Calculator', () => {
  let calculator: Calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(calculator.add(2, 3)).toBe(5);
    });

    it('should add negative numbers', () => {
      expect(calculator.add(-5, -3)).toBe(-8);
    });

    it('should add positive and negative numbers', () => {
      expect(calculator.add(10, -3)).toBe(7);
    });

    it('should handle zero', () => {
      expect(calculator.add(0, 5)).toBe(5);
      expect(calculator.add(5, 0)).toBe(5);
    });
  });

  describe('subtract', () => {
    it('should subtract two positive numbers', () => {
      expect(calculator.subtract(10, 3)).toBe(7);
    });

    it('should subtract negative numbers', () => {
      expect(calculator.subtract(-5, -3)).toBe(-2);
    });

    it('should handle zero', () => {
      expect(calculator.subtract(5, 0)).toBe(5);
      expect(calculator.subtract(0, 5)).toBe(-5);
    });
  });

  describe('multiply', () => {
    it('should multiply two positive numbers', () => {
      expect(calculator.multiply(4, 5)).toBe(20);
    });

    it('should multiply negative numbers', () => {
      expect(calculator.multiply(-3, -4)).toBe(12);
    });

    it('should multiply positive and negative numbers', () => {
      expect(calculator.multiply(5, -3)).toBe(-15);
    });

    it('should handle zero', () => {
      expect(calculator.multiply(5, 0)).toBe(0);
      expect(calculator.multiply(0, 5)).toBe(0);
    });
  });

  describe('divide', () => {
    it('should divide two positive numbers', () => {
      expect(calculator.divide(10, 2)).toBe(5);
    });

    it('should divide negative numbers', () => {
      expect(calculator.divide(-10, -2)).toBe(5);
    });

    it('should divide positive and negative numbers', () => {
      expect(calculator.divide(10, -2)).toBe(-5);
    });

    it('should handle decimal results', () => {
      expect(calculator.divide(7, 2)).toBe(3.5);
    });

    it('should throw error when dividing by zero', () => {
      expect(() => calculator.divide(10, 0)).toThrow('Division by zero is not allowed');
    });

    it('should throw error when dividing zero by zero', () => {
      expect(() => calculator.divide(0, 0)).toThrow('Division by zero is not allowed');
    });
  });
});
