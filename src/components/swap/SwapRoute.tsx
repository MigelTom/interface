import { Trans } from '@lingui/macro'
import { Trade } from '@uniswap/router-sdk'
import { Currency, Percent, TradeType } from '@uniswap/sdk-core'
import { Pair } from '@uniswap/v2-sdk'
import AnimatedDropdown from 'components/AnimatedDropdown'
import { AutoColumn } from 'components/Column'
import { LoadingRows } from 'components/Loader/styled'
import RoutingDiagram, { RoutingDiagramEntry } from 'components/RoutingDiagram/RoutingDiagram'
import { AutoRow, RowBetween } from 'components/Row'
import useAutoRouterSupported from 'hooks/useAutoRouterSupported'
import { darken } from 'polished'
import { memo, useState } from 'react'
import { Plus } from 'react-feather'
import { InterfaceTrade } from 'state/routing/types'
import { useDarkModeManager } from 'state/user/hooks'
import styled from 'styled-components/macro'
import { Separator, TYPE } from 'theme'

import { AutoRouterLabel, AutoRouterLogo } from './RouterLabel'

const Wrapper = styled(AutoColumn)<{ open: boolean; darkMode?: boolean }>`
  padding: 8px 12px;
  border-radius: 12px;
  background-color: ${({ theme, darkMode }) => (darkMode ? darken(0.01, theme.blue4) : 'transparent')};
  grid-row-gap: ${({ open }) => (open ? '12px' : 0)};
`

const OpenCloseIcon = styled(Plus)<{ open?: boolean }>`
  margin-left: 8px;
  transition: transform 0.1s;
  transform: ${({ open }) => (open ? 'rotate(45deg)' : 'none')};
  stroke: ${({ theme }) => theme.blue1};
  cursor: pointer;
  :hover {
    opacity: 0.8;
  }
`

const V2_DEFAULT_FEE_TIER = 3000

export default memo(function SwapRoute({
  trade,
  syncing,
  fixedOpen = false,
}: {
  trade: InterfaceTrade<Currency, Currency, TradeType>
  syncing: boolean
  fixedOpen?: boolean // fixed in open state, hide open/close icon
}) {
  const autoRouterSupported = useAutoRouterSupported()
  const routes = getTokenPath(trade)
  const [open, setOpen] = useState(false)

  const [darkMode] = useDarkModeManager()

  return (
    <Wrapper open={open || fixedOpen} darkMode={darkMode}>
      <RowBetween>
        <AutoRow gap="4px" width="auto">
          <AutoRouterLogo />
          <AutoRouterLabel />
        </AutoRow>
        {fixedOpen ? null : <OpenCloseIcon open={open} onClick={() => setOpen(!open)} />}
      </RowBetween>
      <AnimatedDropdown open={open || fixedOpen}>
        <AutoRow gap="6px" width="auto">
          {syncing ? (
            <LoadingRows>
              <div style={{ width: '400px', height: '30px' }} />
            </LoadingRows>
          ) : (
            <RoutingDiagram
              currencyIn={trade.inputAmount.currency}
              currencyOut={trade.outputAmount.currency}
              routes={routes}
            />
          )}
          <Separator />
          {autoRouterSupported &&
            (syncing ? (
              <LoadingRows>
                <div style={{ width: '250px', height: '15px' }} />
              </LoadingRows>
            ) : (
              <TYPE.main fontSize={12} width={400}>
                {/* could not get <Plural> to render `one` correctly. */}
                {trade?.gasUseEstimateUSD ? (
                  <Trans>Best price route costs ~${trade.gasUseEstimateUSD.toFixed(2)} in gas. </Trans>
                ) : null}{' '}
                <Trans>Your price is optimized by considering split routes, multiple hops, and gas costs.</Trans>
              </TYPE.main>
            ))}
        </AutoRow>
      </AnimatedDropdown>
    </Wrapper>
  )
})

function getTokenPath(trade: Trade<Currency, Currency, TradeType>): RoutingDiagramEntry[] {
  return trade.swaps.map(({ route: { path: tokenPath, pools, protocol }, inputAmount, outputAmount }) => {
    const portion =
      trade.tradeType === TradeType.EXACT_INPUT
        ? inputAmount.divide(trade.inputAmount)
        : outputAmount.divide(trade.outputAmount)

    const percent = new Percent(portion.numerator, portion.denominator)

    const path: RoutingDiagramEntry['path'] = []
    for (let i = 0; i < pools.length; i++) {
      const nextPool = pools[i]
      const tokenIn = tokenPath[i]
      const tokenOut = tokenPath[i + 1]

      const entry: RoutingDiagramEntry['path'][0] = [
        tokenIn,
        tokenOut,
        nextPool instanceof Pair ? V2_DEFAULT_FEE_TIER : nextPool.fee,
      ]

      path.push(entry)
    }

    return {
      percent,
      path,
      protocol,
    }
  })
}
