import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';

type LogoProps = {
  size?: number;
  textSize?: number;
  textColor?: string;
  logoColor?: string;
};

const Logo: React.FC<LogoProps> = ({
  size = 100,
  textSize = 18,
  textColor = '#3D405B',
  logoColor = '#E07A5F',
}) => {
  const iconSize = size * 0.7;
  
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          {/* Camera icon */}
          <Path
            d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
            stroke={logoColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Camera lens */}
          <Circle
            cx="12"
            cy="13"
            r="4"
            stroke={logoColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Fork and knife for "Cook" */}
          <Path
            d="M17.5 10.5V17.5"
            stroke={logoColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M6.5 17.5V15C6.5 12.5 8.5 12 8.5 10.5"
            stroke={logoColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M6.5 10.5V9"
            stroke={logoColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      
      <Text style={[styles.text, { fontSize: textSize, color: textColor }]}>
        Snap & Cook
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: 'bold',
  },
});

export default Logo; 