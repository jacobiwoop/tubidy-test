import { useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

/**
 * Hook réutilisable pour le swipe-to-dismiss sur les bottom sheets / modals.
 *
 * Usage :
 *   const { pan, opacity, panHandlers, animatedStyle } = useSwipeToDismiss({ onDismiss: onClose });
 *
 *   <Animated.View style={[styles.container, animatedStyle]} {...panHandlers}>
 *     ...
 *   </Animated.View>
 *
 * Options :
 *   threshold  : distance en px pour déclencher la fermeture (défaut: 120)
 *   velocityThreshold : vitesse pour déclencher la fermeture (défaut: 0.8)
 *   fadeStart  : px à partir duquel l'opacité commence à baisser (défaut: 60)
 *   direction  : 'down' (défaut) ou 'up'
 */
export function useSwipeToDismiss({
  onDismiss,
  threshold = 120,
  velocityThreshold = 0.8,
  fadeStart = 60,
  direction = 'down',
} = {}) {
  const pan     = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        const dy = direction === 'down' ? g.dy : -g.dy;
        return dy > 8 && Math.abs(g.dx) < Math.abs(g.dy);
      },
      onPanResponderGrant: () => {
        pan.setOffset(pan._value);
        pan.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        const dy = direction === 'down' ? g.dy : -g.dy;
        if (dy > 0) {
          pan.setValue(direction === 'down' ? g.dy : -g.dy);
          const newOpacity = 1 - Math.max(0, Math.min(0.8, (dy - fadeStart) / 280));
          opacity.setValue(newOpacity);
        }
      },
      onPanResponderRelease: (_, g) => {
        pan.flattenOffset();
        const dy = direction === 'down' ? g.dy : -g.dy;
        const vy = direction === 'down' ? g.vy : -g.vy;

        if (dy > threshold || vy > velocityThreshold) {
          Animated.parallel([
            Animated.timing(pan,     { toValue: direction === 'down' ? 800 : -800, duration: 250, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => {
            onDismiss?.();
            pan.setValue(0);
            opacity.setValue(1);
          });
        } else {
          Animated.parallel([
            Animated.spring(pan,     { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }),
            Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 60, friction: 12 }),
          ]).start();
        }
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        Animated.parallel([
          Animated.spring(pan,     { toValue: 0, useNativeDriver: true }),
          Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  const animatedStyle = {
    transform: [{ translateY: pan }],
    opacity,
  };

  return {
    pan,
    opacity,
    panHandlers: panResponder.panHandlers,
    animatedStyle,
  };
}
