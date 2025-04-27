import React from 'react';
import { Stack } from 'expo-router';

export default function AIAssistanceLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAF9F7' },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{
          title: 'AI Features',
        }} 
      />
      <Stack.Screen
        name="ingredient-scanner"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
} 