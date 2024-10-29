import { useState, useEffect } from 'react';
import { Text } from 'ink';

const retry = async <TResult,>(
  operation: () => Promise<TResult>,
  retries = 3,
  delay = 100
): Promise<TResult> => {
  let count = 0;

  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        resolve(await operation());
      } catch (error) {
        if (count < retries) {
          count++;
          resolve(await retry(operation, retries));
        } else {
          reject(error);
        }
      }
    }, delay);
  });
};

export const CheckOperation = <TResult,>({
  label,
  operation,
  operationAssertion,
  messages,
  onDone,
  retries = 3,
  delay = 100,
}: {
  label: string;
  operation: () => Promise<TResult>;
  operationAssertion: (result: TResult) => boolean;
  messages: { success: string; error: string };
  onDone: () => void;
  retries?: number;
  delay?: number;
}) => {
  type Result = { state: 'success' } | { state: 'error'; error: string };

  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    const checkDbConnection = async () => {
      try {
        const result = await retry(operation, retries, delay);
        operationAssertion(result)
          ? setResult({ state: 'success' })
          : setResult({
              state: 'error',
              error: 'Operation result is not valid',
            });
      } catch (error) {
        setResult({ state: 'error', error: (error as Error).message });
      } finally {
        onDone();
      }
    };
    checkDbConnection();
  }, []);

  if (!result) {
    return null;
  }

  return (
    <Text>
      {label}:{' '}
      {result.state === 'success' && (
        <Text color='green'>{messages.success}</Text>
      )}
      {result.state === 'error' && (
        <Text color='red'>
          ❌ {messages.error}: {result.error}
        </Text>
      )}
    </Text>
  );
};
