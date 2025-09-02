import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated, Text } from 'react-native';
import FadeInView from './index';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      timing: jest.fn(() => ({
        start: jest.fn(),
      })),
      Value: jest.fn(() => ({
        setValue: jest.fn(),
      })),
    },
  };
});

describe('FadeInView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with children', () => {
    const { getByText, toJSON } = render(
      <FadeInView>
        <Text>Test Content</Text>
      </FadeInView>,
    );

    expect(getByText('Test Content')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('initializes with opacity 0 and animates to 1', () => {
    const mockSetValue = jest.fn();
    const mockStart = jest.fn();

    (Animated.Value as jest.Mock).mockReturnValue({
      setValue: mockSetValue,
    });
    (Animated.timing as jest.Mock).mockReturnValue({
      start: mockStart,
    });

    render(
      <FadeInView>
        <Text>Test</Text>
      </FadeInView>,
    );

    expect(mockSetValue).toHaveBeenCalledWith(0);
    expect(Animated.timing).toHaveBeenCalledWith(expect.anything(), {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    });
    expect(mockStart).toHaveBeenCalled();
  });

  it('uses custom fade duration when provided', () => {
    const customDuration = 500;

    render(
      <FadeInView fadeDuration={customDuration}>
        <Text>Test</Text>
      </FadeInView>,
    );

    expect(Animated.timing).toHaveBeenCalledWith(expect.anything(), {
      toValue: 1,
      duration: customDuration,
      useNativeDriver: true,
    });
  });

  it('passes through additional view props', () => {
    const testId = 'fade-in-view-test';
    const { getByTestId } = render(
      <FadeInView testID={testId}>
        <Text>Test</Text>
      </FadeInView>,
    );

    expect(getByTestId(testId)).toBeTruthy();
  });

  it('resets animation when fadeDuration changes', () => {
    const mockSetValue = jest.fn();

    (Animated.Value as jest.Mock).mockReturnValue({
      setValue: mockSetValue,
    });

    const { rerender } = render(
      <FadeInView fadeDuration={200}>
        <Text>Test</Text>
      </FadeInView>,
    );

    mockSetValue.mockClear();

    rerender(
      <FadeInView fadeDuration={300}>
        <Text>Test</Text>
      </FadeInView>,
    );

    expect(mockSetValue).toHaveBeenCalledWith(0);
  });
});
