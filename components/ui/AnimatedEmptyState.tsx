import React from 'react';
import { ThemedLoader } from './ThemedLoader';

export const AnimatedEmptyState: React.FC<{ message?: string }> = ({
  message = 'Загружаем данные',
}) => <ThemedLoader variant="section" message={message} />;
