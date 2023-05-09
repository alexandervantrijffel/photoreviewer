import {
  ApolloClient,
  ApolloProvider,
  from,
  HttpLink,
  InMemoryCache,
  split,
  type NormalizedCacheObject,
} from '@apollo/client'
import { DocumentNode } from 'graphql'
import { RetryLink } from '@apollo/client/link/retry'

import { onError } from '@apollo/client/link/error'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'
import { createContext, FC, useContext, useEffect, useState } from 'react'

import type { ErrorMessage } from '@/components/Modal/Error/Error'
import { Loading } from '@/features/Discovery'

interface AppApolloProviderProps {
  children: React.ReactNode
}

const ApolloErrorContext = createContext<[ErrorMessage[], () => void]>([
  [],
  () => {
    console.error('context not initialized')
  },
])

export const getGraphQLHost = () => {
  // assume we run in the browser, just use the current hostname
  if (import.meta.env.PROD) {
    // host includes hostname and port
    return window.location.host
  }

  const { VITE_MEDIA_MANAGER_GRAPHQL_HOST } = import.meta.env
  if (!VITE_MEDIA_MANAGER_GRAPHQL_HOST) {
    throw new Error('missing VITE_GRAPHQL_HOST env var')
  }

  return VITE_MEDIA_MANAGER_GRAPHQL_HOST
}

export const useApolloErrorContext = () => useContext(ApolloErrorContext)

export const AppApolloProvider: FC<AppApolloProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<ErrorMessage[]>([])
  const [endpoint, _setEndpoint] = useState<string>(getGraphQLHost())
  const [client, setClient] = useState<ApolloClient<NormalizedCacheObject>>()

  useEffect(() => {
    if (endpoint) {
      // endpoint already known
      return
    }

    throw new Error('graphql endpoint not known')
  }, [endpoint])

  useEffect(() => {
    if (!endpoint) {
      // endpoint not know yet
      return
    }

    const uri = `http://${endpoint}/graphql`
    console.log('connecting to grapqhql gateway endpoint: ' + uri)

    const httpLink = new HttpLink({
      uri,
    })

    let activeSocket: any, timedOut: NodeJS.Timeout
    const wsLink = new GraphQLWsLink(
      createClient({
        url: `ws://${endpoint}/graphql`,
        retryAttempts: Infinity,
        keepAlive: 10_000, // ping server every 10 seconds
        lazyCloseTimeout: Infinity,
        shouldRetry: (errOrCloseEvent) => {
          console.log('should retry?', errOrCloseEvent)
          return true
        },
        on: {
          connecting: () => console.log('connecting'),
          connected: (socket) => {
            activeSocket = socket
            console.log('connected')
            setErrors([])
          },
          closed: () => {
            console.log('closed')
            setErrors([
              {
                message: 'No longer connected to ProSim System. Trying to reconnect.',
              },
            ])
          },
          opened: () => {
            console.log('opened')
            setErrors([])
          },
          error: (err) => {
            console.log('error', err)
            setErrors([
              {
                message: 'No longer connected to ProSim System. Trying to reconnect.',
              },
            ])
          },
          ping: (received) => {
            if (!received) {
              timedOut = setTimeout(() => {
                if (activeSocket.readyState === WebSocket.OPEN) {
                  activeSocket.close(4408, 'Request Timeout')
                }
              }, 5000) // Wait 5 seconds for the pong and then close the connection
            }
          },
          pong: (received) => {
            if (received) clearTimeout(timedOut) // pong is received, clear connection close timeout
          },
        },
      }),
    )

    const splitLink = split(
      ({ query }: { query: DocumentNode }) => {
        const definition = getMainDefinition(query)
        return definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
      },

      wsLink,
      httpLink,
    )

    const cache = new InMemoryCache()

    const errorLink = onError(({ graphQLErrors, networkError }) => {
      console.log('[GraphQL Errors:]', graphQLErrors, '[Network Error:]', networkError)

      if (graphQLErrors) {
        graphQLErrors.forEach(({ message, locations, path }) => {
          console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)

          setErrors([{ message }])
        })
      }

      if (networkError) {
        console.log(`[Network error]: ${networkError}`)
        setErrors([{ message: networkError.message }])
      }
    })

    const retryLink = new RetryLink({
      delay: {
        initial: 300,
        max: 5000,
        jitter: true,
      },
      attempts: {
        max: Infinity,
        retryIf: (error, _operation) => !!error,
      },
    })

    setClient(
      new ApolloClient({
        link: from([errorLink, retryLink, splitLink]),
        cache,
      }),
    )
  }, [endpoint])

  if (!client) {
    return <>Loading...</>
  }

  return (
    <ApolloProvider client={client}>
      <ApolloErrorContext.Provider value={[errors, () => setErrors([])]}>{children}</ApolloErrorContext.Provider>
    </ApolloProvider>
  )
}
