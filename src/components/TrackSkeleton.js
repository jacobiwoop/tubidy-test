import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const TrackSkeleton = () => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.cover, { opacity }]} />
      <View style={styles.info}>
        <Animated.View style={[styles.title, { opacity }]} />
        <Animated.View style={[styles.artist, { opacity }]} />
      </View>
      <Animated.View style={[styles.action, { opacity }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#121212',
    borderRadius: 12,
  },
  cover: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  title: {
    width: '60%',
    height: 14,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    marginBottom: 8,
  },
  artist: {
    width: '40%',
    height: 10,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
  },
  action: {
    width: 24,
    height: 24,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  }
});

export default TrackSkeleton;
