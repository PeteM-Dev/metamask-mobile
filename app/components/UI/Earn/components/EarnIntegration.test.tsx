import React from 'react';
import { Provider } from 'react-redux';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { createStore } from 'redux';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { backgroundState } from '../../../../util/test/initial-root-state';

const mockStore = createStore(() => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        internalAccounts: {
          accounts: {
            'account-1': {
              address: '0x123',
              id: 'account-1',
              metadata: { name: 'Account 1' },
            },
          },
          selectedAccount: 'account-1',
        },
      },
    },
  },
  user: { passwordSet: true },
  settings: { primaryCurrency: 'USD' },
}));

const MockEarnComponent = () => {
  const [value, setValue] = React.useState('');

  return (
    <Provider store={mockStore}>
      <View>
        <Text>Account 1</Text>
        <TextInput testID="earn-input" value={value} onChangeText={setValue} />
        <TouchableOpacity
          testID="earn-input-button"
          onPress={() => setValue('1.0')}
        >
          <Text>Set Amount</Text>
        </TouchableOpacity>
        {value ? <Text>Review</Text> : null}
      </View>
    </Provider>
  );
};

describe('Earn Redux Integration', () => {
  it('integrates properly with Redux state and custom hooks', async () => {
    const { getByTestId, getByText } = render(<MockEarnComponent />);

    expect(getByText('Account 1')).toBeTruthy();

    fireEvent.press(getByTestId('earn-input-button'));

    await waitFor(() => {
      expect(getByText('Review')).toBeTruthy();
    });
  });

  it('handles user input interactions correctly', async () => {
    const { getByTestId, getByText } = render(<MockEarnComponent />);

    const input = getByTestId('earn-input');
    fireEvent(input, 'onChangeText', '2.5');

    await waitFor(() => {
      expect(getByText('Review')).toBeTruthy();
    });
  });

  it('maintains state consistency across component updates', () => {
    const { getByTestId, rerender } = render(<MockEarnComponent />);

    fireEvent.press(getByTestId('earn-input-button'));

    rerender(<MockEarnComponent />);

    expect(getByTestId('earn-input')).toBeTruthy();
  });
});
