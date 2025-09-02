import { expectSaga } from 'redux-saga-test-plan';
import {
  UserActionType,
  authError,
  authSuccess,
  checkForDeeplink,
  interruptBiometrics,
} from '../../actions/user';
import Routes from '../../constants/navigation/Routes';
import {
  biometricsStateMachine,
  authStateMachine,
  appLockStateMachine,
  startAppServices,
  handleDeeplinkSaga,
} from './';
import { NavigationActionType } from '../../actions/navigation';
import EngineService from '../../core/EngineService';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import SharedDeeplinkManager from '../../core/DeeplinkManager/SharedDeeplinkManager';
import Engine from '../../core/Engine';
import { setCompletedOnboarding } from '../../actions/onboarding';

const mockBioStateMachineId = '123';

const mockNavigate = jest.fn();

jest.mock('../../core/NavigationService', () => ({
  navigation: {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate: (screen: any, params?: any) => {
      params ? mockNavigate(screen, params) : mockNavigate(screen);
    },
  },
}));

// Mock the services
jest.mock('../../core/EngineService', () => ({
  start: jest.fn(),
}));

jest.mock('../../core/AppStateEventListener', () => ({
  AppStateEventProcessor: {
    start: jest.fn(),
  },
}));

jest.mock('../../core/Engine', () => ({
  context: {
    AccountTreeController: {
      init: jest.fn(),
    },
    AccountsController: {
      updateAccounts: jest.fn(),
    },
    RemoteFeatureFlagController: {
      state: {
        remoteFeatureFlags: {
          enableMultichainAccounts: {
            version: '1',
            enabled: true,
          },
        },
      },
    },
    KeyringController: {
      isUnlocked: jest.fn().mockReturnValue(false),
    },
  },
}));

jest.mock('../../core/DeeplinkManager/SharedDeeplinkManager', () => ({
  parse: jest.fn(),
}));

jest.mock('../../core/AppStateEventListener', () => ({
  AppStateEventProcessor: {
    start: jest.fn(),
    pendingDeeplink: null,
    clearPendingDeeplink: jest.fn(),
  },
}));

describe('authStateMachine', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should fork appLockStateMachine when logged in', async () => {
    await expectSaga(authStateMachine)
      .fork(appLockStateMachine)
      .dispatch({ type: UserActionType.LOGIN })
      .silentRun();
  });

  it('should cancel appLockStateMachine when logged out', async () => {
    await expectSaga(authStateMachine)
      .fork(appLockStateMachine)
      .dispatch({ type: UserActionType.LOGIN })
      .dispatch({ type: UserActionType.LOGOUT })
      .silentRun();
  });
});

describe('appLockStateMachine', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should fork biometricsStateMachine and navigate when app is locked', async () => {
    await expectSaga(appLockStateMachine)
      .fork(biometricsStateMachine, mockBioStateMachineId)
      .dispatch({ type: UserActionType.LOCKED_APP })
      .silentRun();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.LOCK_SCREEN, {
      bioStateMachineId: mockBioStateMachineId,
    });
  });

  it('should handle app unlock correctly', async () => {
    await expectSaga(appLockStateMachine)
      .fork(biometricsStateMachine, mockBioStateMachineId)
      .dispatch({ type: UserActionType.LOCKED_APP })
      .silentRun();
  });
});

describe('biometricsStateMachine', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should handle biometric interruption correctly', async () => {
    await expectSaga(biometricsStateMachine, mockBioStateMachineId)
      .take([
        UserActionType.AUTH_SUCCESS,
        UserActionType.AUTH_ERROR,
        UserActionType.INTERRUPT_BIOMETRICS,
      ])
      .dispatch(interruptBiometrics())
      .silentRun();
  });

  it('should navigate to Wallet when authenticating without interruptions via biometrics', async () => {
    await expectSaga(biometricsStateMachine, mockBioStateMachineId)
      .take([
        UserActionType.AUTH_SUCCESS,
        UserActionType.AUTH_ERROR,
        UserActionType.INTERRUPT_BIOMETRICS,
      ])
      .dispatch(authSuccess(mockBioStateMachineId))
      .silentRun();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.ONBOARDING.HOME_NAV);
  });

  it('should not navigate to Wallet when authentication succeeds with different bioStateMachineId', async () => {
    await expectSaga(biometricsStateMachine, mockBioStateMachineId)
      .take([
        UserActionType.AUTH_SUCCESS,
        UserActionType.AUTH_ERROR,
        UserActionType.INTERRUPT_BIOMETRICS,
      ])
      .dispatch(authSuccess('wrongBioStateMachineId'))
      .silentRun();

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should not do anything when AUTH_ERROR is encountered', async () => {
    await expectSaga(biometricsStateMachine, mockBioStateMachineId)
      .take([
        UserActionType.AUTH_SUCCESS,
        UserActionType.AUTH_ERROR,
        UserActionType.INTERRUPT_BIOMETRICS,
      ])
      .dispatch(authError(mockBioStateMachineId))
      .silentRun();

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('startAppServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start app services', async () => {
    await expectSaga(startAppServices)
      // Dispatch both required actions
      .dispatch({ type: UserActionType.ON_PERSISTED_DATA_LOADED })
      .dispatch({ type: NavigationActionType.ON_NAVIGATION_READY })
      .run();

    // Verify services are started
    expect(EngineService.start).toHaveBeenCalled();
    expect(AppStateEventProcessor.start).toHaveBeenCalled();
  });

  it('should not start app services if navigation is not ready', async () => {
    await expectSaga(startAppServices)
      // Dispatch both required actions
      .dispatch({ type: UserActionType.ON_PERSISTED_DATA_LOADED })
      .run();

    // Verify services are not started
    expect(EngineService.start).not.toHaveBeenCalled();
    expect(AppStateEventProcessor.start).not.toHaveBeenCalled();
  });

  it('should not start app services if persisted data is not loaded', async () => {
    await expectSaga(startAppServices)
      // Dispatch both required actions
      .dispatch({ type: NavigationActionType.ON_NAVIGATION_READY })
      .run();

    // Verify services are not started
    expect(EngineService.start).not.toHaveBeenCalled();
    expect(AppStateEventProcessor.start).not.toHaveBeenCalled();
  });
});

describe('handleDeeplinkSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('without deeplink', () => {
    it('should skip handling deeplink', async () => {
      // Triggered by CHECK_FOR_DEEPLINK action
      await expectSaga(handleDeeplinkSaga)
        .withState({
          onboarding: { completedOnboarding: false },
          user: {},
          engine: { backgroundState: {} },
          confirmation: {},
          navigation: {},
          security: {},
          sdk: {},
          inpageProvider: {},
          confirmationMetrics: {},
          originThrottling: {},
          notifications: {},
          bridge: {},
          banners: {},
        })
        .dispatch(checkForDeeplink())
        .silentRun();

      expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
      expect(
        AppStateEventProcessor.clearPendingDeeplink,
      ).not.toHaveBeenCalled();
    });
  });

  describe('with deeplink', () => {
    describe('when app is locked', () => {
      it('should skip handling deeplink', async () => {
        AppStateEventProcessor.pendingDeeplink = 'dummy-deeplink';

        // Triggered by CHECK_FOR_DEEPLINK action
        await expectSaga(handleDeeplinkSaga)
          .withState({
            onboarding: { completedOnboarding: false },
            user: {},
            engine: { backgroundState: {} },
            confirmation: {},
            navigation: {},
            security: {},
            sdk: {},
            inpageProvider: {},
            confirmationMetrics: {},
            originThrottling: {},
            notifications: {},
            bridge: {},
            banners: {},
          })
          .dispatch(checkForDeeplink())
          .silentRun();

        expect(Engine.context.KeyringController.isUnlocked).toHaveBeenCalled();
        expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
        expect(
          AppStateEventProcessor.clearPendingDeeplink,
        ).not.toHaveBeenCalled();
      });
    });
    describe('when app is unlocked', () => {
      describe('when completed onboarding is false', () => {
        it('should skip handling deeplink', async () => {
          AppStateEventProcessor.pendingDeeplink = 'dummy-deeplink';

          // Triggered by SET_COMPLETED_ONBOARDING action
          await expectSaga(handleDeeplinkSaga)
            .dispatch(setCompletedOnboarding(false))
            .silentRun();

          expect(
            Engine.context.KeyringController.isUnlocked,
          ).toHaveBeenCalled();
          expect(SharedDeeplinkManager.parse).not.toHaveBeenCalled();
          expect(
            AppStateEventProcessor.clearPendingDeeplink,
          ).not.toHaveBeenCalled();
        });
      });
      describe('when completed onboarding is passed in and true', () => {
        it('should parse deeplink', async () => {
          AppStateEventProcessor.pendingDeeplink = 'dummy-deeplink';
          Engine.context.KeyringController.isUnlocked = jest
            .fn()
            .mockReturnValue(true);

          // Triggered by SET_COMPLETED_ONBOARDING action
          await expectSaga(handleDeeplinkSaga)
            .dispatch(setCompletedOnboarding(true))
            .silentRun();

          expect(
            Engine.context.KeyringController.isUnlocked,
          ).toHaveBeenCalled();
          expect(SharedDeeplinkManager.parse).toHaveBeenCalled();
          expect(
            AppStateEventProcessor.clearPendingDeeplink,
          ).toHaveBeenCalled();
        });
      });
      describe('when completed onboarding is true in Redux state', () => {
        it('should parse deeplink', async () => {
          AppStateEventProcessor.pendingDeeplink = 'dummy-deeplink';
          Engine.context.KeyringController.isUnlocked = jest
            .fn()
            .mockReturnValue(true);

          // Triggered by CHECK_FOR_DEEPLINK action
          await expectSaga(handleDeeplinkSaga)
            .withState({
              onboarding: { completedOnboarding: true },
              user: {},
              engine: { backgroundState: {} },
              confirmation: {},
              navigation: {},
              security: {},
              sdk: {},
              inpageProvider: {},
              confirmationMetrics: {},
              originThrottling: {},
              notifications: {},
              bridge: {},
              banners: {},
            })
            .dispatch(checkForDeeplink())
            .silentRun();

          expect(
            Engine.context.KeyringController.isUnlocked,
          ).toHaveBeenCalled();
          expect(SharedDeeplinkManager.parse).toHaveBeenCalled();
          expect(
            AppStateEventProcessor.clearPendingDeeplink,
          ).toHaveBeenCalled();
        });
      });
    });
  });
});
