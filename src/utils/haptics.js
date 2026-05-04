import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const triggerHaptic = (type = "impactLight") => {
  ReactNativeHapticFeedback.trigger(type, options);
};
