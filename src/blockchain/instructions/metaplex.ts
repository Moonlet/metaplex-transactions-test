import BN from 'bn.js';
import { TransactionInstruction, SYSVAR_CLOCK_PUBKEY, SystemProgram, SYSVAR_RENT_PUBKEY, PublicKey } from "@solana/web3.js"
import { serialize } from 'borsh'
import { StringPublicKey, programIds, getAuctionKeys, getBidderPotKey, ClaimBidArgs, SCHEMA, getAuctionExtended, toPublicKey, getSafetyDepositConfig, getAuctionWinnerTokenTypeTracker, EmptyPaymentAccountArgs, getPayoutTicket, EndAuctionArgs, TupleNumericType, InitAuctionManagerV2Args, getBidderKeys, findProgramAddress, VAULT_PREFIX, RedeemUnusedWinningConfigItemsAsAuctioneerArgs, ProxyCallAddress, RedeemBidArgs, RedeemFullRightsTransferBidArgs, StartAuctionArgs, SafetyDepositConfig, getOriginalAuthority, ValidateSafetyDepositBoxV2Args } from '..';

export async function claimBid(
    acceptPayment: StringPublicKey,
    bidder: StringPublicKey,
    bidderPotToken: StringPublicKey,
    vault: StringPublicKey,
    tokenMint: StringPublicKey
): Promise<TransactionInstruction> {
    const PROGRAM_IDS = programIds()
    const store = PROGRAM_IDS.store
    if (!store) {
        throw new Error('Store not initialized')
    }

    const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault)

    const bidderPotKey = await getBidderPotKey({
        auctionProgramId: PROGRAM_IDS.auction,
        auctionKey,
        bidderPubkey: bidder,
    })

    const value = new ClaimBidArgs()
    const data = Buffer.from(serialize(SCHEMA, value))

    const auctionExtendedKey = await getAuctionExtended({
        auctionProgramId: PROGRAM_IDS.auction,
        resource: vault,
    })

    const keys = [
        {
            pubkey: toPublicKey(acceptPayment),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(bidderPotToken),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(bidderPotKey),
            isSigner: false,
            isWritable: true,
        },

        {
            pubkey: toPublicKey(auctionManagerKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(auctionKey),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(bidder),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(tokenMint),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(vault),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(store),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(PROGRAM_IDS.auction),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SYSVAR_CLOCK_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: PROGRAM_IDS.token,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(auctionExtendedKey),
            isSigner: false,
            isWritable: false,
        },
    ]

    return new TransactionInstruction({
        keys,
        programId: toPublicKey(PROGRAM_IDS.metaplex),
        data,
    })
}

export async function emptyPaymentAccount(
    acceptPayment: StringPublicKey,
    destination: StringPublicKey,
    auctionManager: StringPublicKey,
    metadata: StringPublicKey,
    masterEdition: StringPublicKey | undefined,
    safetyDepositBox: StringPublicKey,
    vault: StringPublicKey,
    auction: StringPublicKey,
    payer: StringPublicKey,
    recipient: StringPublicKey,
    winningConfigIndex: number | null,
    winningConfigItemIndex: number | null,
    creatorIndex: number | null
): Promise<TransactionInstruction> {
    const PROGRAM_IDS = programIds()
    const store = PROGRAM_IDS.store
    if (!store) {
        throw new Error('Store not initialized')
    }

    const safetyDepositConfig = await getSafetyDepositConfig(auctionManager, safetyDepositBox)

    const tokenTracker = await getAuctionWinnerTokenTypeTracker(auctionManager)

    const value = new EmptyPaymentAccountArgs({
        winningConfigIndex,
        winningConfigItemIndex,
        creatorIndex,
    })

    const data = Buffer.from(serialize(SCHEMA, value))

    const keys = [
        {
            pubkey: toPublicKey(acceptPayment),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(destination),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(auctionManager),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(
                await getPayoutTicket(
                    auctionManager,
                    winningConfigIndex,
                    winningConfigItemIndex,
                    creatorIndex,
                    safetyDepositBox,
                    recipient
                )
            ),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(metadata),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(masterEdition || SystemProgram.programId),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(safetyDepositBox),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(store),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(vault),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(auction),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: PROGRAM_IDS.token,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },

        {
            pubkey: toPublicKey(tokenTracker),
            isSigner: false,
            isWritable: false,
        },

        {
            pubkey: toPublicKey(safetyDepositConfig),
            isSigner: false,
            isWritable: false,
        },
    ]

    return new TransactionInstruction({
        keys,
        programId: toPublicKey(PROGRAM_IDS.metaplex),
        data,
    })
}

export async function endAuction(
    vault: PublicKey,
    auctionManagerAuthority: PublicKey
): Promise<TransactionInstruction> {
    const PROGRAM_IDS = programIds()
    const store = PROGRAM_IDS.store
    if (!store) {
        throw new Error('Store not initialized')
    }

    const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault.toString())
    const auctionExtended = await getAuctionExtended({
        auctionProgramId: PROGRAM_IDS.auction,
        resource: vault.toString(),
    })
    const value = new EndAuctionArgs({ reveal: null })
    const data = Buffer.from(serialize(SCHEMA, value))

    const keys = [
        {
            pubkey: toPublicKey(auctionManagerKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(auctionKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(auctionExtended),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(auctionManagerAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(store),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(PROGRAM_IDS.auction),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(SYSVAR_CLOCK_PUBKEY),
            isSigner: false,
            isWritable: false,
        },
    ]

    return new TransactionInstruction({
        keys,
        programId: toPublicKey(PROGRAM_IDS.metaplex),
        data,
    })
}

export async function initAuctionManagerV2(
    vault: StringPublicKey,
    auctionManagerAuthority: StringPublicKey,
    payer: StringPublicKey,
    acceptPaymentAccount: StringPublicKey,
    store: StringPublicKey,
    amountType: TupleNumericType,
    lengthType: TupleNumericType,
    maxRanges: BN
): Promise<TransactionInstruction> {
    const PROGRAM_IDS = programIds()
    const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault)

    const value = new InitAuctionManagerV2Args({
        amountType,
        lengthType,
        maxRanges,
    })

    const tokenTracker = await getAuctionWinnerTokenTypeTracker(auctionManagerKey)

    const data = Buffer.from(serialize(SCHEMA, value))

    const keys = [
        {
            pubkey: toPublicKey(auctionManagerKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(tokenTracker),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(vault),
            isSigner: false,
            isWritable: false,
        },

        {
            pubkey: toPublicKey(auctionKey),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(auctionManagerAuthority),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(acceptPaymentAccount),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(store),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ]

    return new TransactionInstruction({
        keys,
        programId: toPublicKey(PROGRAM_IDS.metaplex),
        data,
    })
}

export async function redeemBid(
    vault: StringPublicKey,
    safetyDepositTokenStore: StringPublicKey,
    destination: StringPublicKey,
    safetyDeposit: StringPublicKey,
    fractionMint: StringPublicKey,
    bidder: StringPublicKey,
    payer: StringPublicKey,
    masterEdition: StringPublicKey | undefined,
    reservationList: StringPublicKey | undefined,
    isPrintingType: boolean,
    // If this is an auctioneer trying to reclaim a specific winning index, pass it here,
    // and this will instead call the proxy route instead of the real one, wrapping the original
    // redemption call in an override call that forces the winning index if the auctioneer is authorized.
    auctioneerReclaimIndex?: number
): Promise<TransactionInstruction> {
    const PROGRAM_IDS = programIds()
    const store = PROGRAM_IDS.store
    if (!store) {
        throw new Error('Store not initialized')
    }

    const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault)

    const { bidRedemption, bidMetadata } = await getBidderKeys(auctionKey, bidder)

    const transferAuthority: StringPublicKey = (
        await findProgramAddress(
            [
                Buffer.from(VAULT_PREFIX),
                toPublicKey(PROGRAM_IDS.vault).toBuffer(),
                toPublicKey(vault).toBuffer(),
            ],
            toPublicKey(PROGRAM_IDS.vault)
        )
    )[0]

    const safetyDepositConfig = await getSafetyDepositConfig(auctionManagerKey, safetyDeposit)

    const auctionExtended = await getAuctionExtended({
        auctionProgramId: PROGRAM_IDS.auction,
        resource: vault,
    })

    const value =
        auctioneerReclaimIndex !== undefined
            ? new RedeemUnusedWinningConfigItemsAsAuctioneerArgs({
                  winningConfigItemIndex: auctioneerReclaimIndex,
                  proxyCall: ProxyCallAddress.RedeemBid,
              })
            : new RedeemBidArgs()
    const data = Buffer.from(serialize(SCHEMA, value))
    const keys = [
        {
            pubkey: toPublicKey(auctionManagerKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(safetyDepositTokenStore),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(destination),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(bidRedemption),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(safetyDeposit),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(vault),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(fractionMint),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(auctionKey),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(bidMetadata),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(bidder),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: PROGRAM_IDS.token,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(PROGRAM_IDS.vault),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(PROGRAM_IDS.metadata),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: store,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(transferAuthority),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(safetyDepositConfig),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(auctionExtended),
            isSigner: false,
            isWritable: false,
        },
    ]

    if (isPrintingType && masterEdition && reservationList) {
        keys.push({
            pubkey: toPublicKey(masterEdition),
            isSigner: false,
            isWritable: true,
        })
        keys.push({
            pubkey: toPublicKey(reservationList),
            isSigner: false,
            isWritable: true,
        })
    }

    return new TransactionInstruction({
        keys,
        programId: toPublicKey(PROGRAM_IDS.metaplex),
        data,
    })
}

export async function redeemFullRightsTransferBid(
    vault: StringPublicKey,
    safetyDepositTokenStore: StringPublicKey,
    destination: StringPublicKey,
    safetyDeposit: StringPublicKey,
    fractionMint: StringPublicKey,
    bidder: StringPublicKey,
    payer: StringPublicKey,
    masterMetadata: StringPublicKey,
    newAuthority: StringPublicKey,
    // If this is an auctioneer trying to reclaim a specific winning index, pass it here,
    // and this will instead call the proxy route instead of the real one, wrapping the original
    // redemption call in an override call that forces the winning index if the auctioneer is authorized.
    auctioneerReclaimIndex?: number
): Promise<TransactionInstruction> {
    const PROGRAM_IDS = programIds()
    const store = PROGRAM_IDS.store
    if (!store) {
        throw new Error('Store not initialized')
    }

    const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault)

    const { bidRedemption, bidMetadata } = await getBidderKeys(auctionKey, bidder)

    const transferAuthority = (
        await findProgramAddress(
            [
                Buffer.from(VAULT_PREFIX),
                toPublicKey(PROGRAM_IDS.vault).toBuffer(),
                toPublicKey(vault).toBuffer(),
            ],
            toPublicKey(PROGRAM_IDS.vault)
        )
    )[0]

    const safetyDepositConfig = await getSafetyDepositConfig(auctionManagerKey, safetyDeposit)

    const auctionExtended = await getAuctionExtended({
        auctionProgramId: PROGRAM_IDS.auction,
        resource: vault,
    })

    const value =
        auctioneerReclaimIndex !== undefined
            ? new RedeemUnusedWinningConfigItemsAsAuctioneerArgs({
                  winningConfigItemIndex: auctioneerReclaimIndex,
                  proxyCall: ProxyCallAddress.RedeemFullRightsTransferBid,
              })
            : new RedeemFullRightsTransferBidArgs()
    const data = Buffer.from(serialize(SCHEMA, value))
    const keys = [
        {
            pubkey: toPublicKey(auctionManagerKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(safetyDepositTokenStore),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(destination),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(bidRedemption),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(safetyDeposit),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(vault),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(fractionMint),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(auctionKey),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(bidMetadata),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(bidder),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: PROGRAM_IDS.token,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(PROGRAM_IDS.vault),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(PROGRAM_IDS.metadata),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: store,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(masterMetadata),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(newAuthority),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(transferAuthority),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(safetyDepositConfig),
            isSigner: false,
            isWritable: false,
        },

        {
            pubkey: toPublicKey(auctionExtended),
            isSigner: false,
            isWritable: false,
        },
    ]

    return new TransactionInstruction({
        keys,
        programId: toPublicKey(PROGRAM_IDS.metaplex),
        data,
    })
}

export async function startAuction(
    vault: StringPublicKey,
    auctionManagerAuthority: StringPublicKey
): Promise<TransactionInstruction> {
    const PROGRAM_IDS = programIds()
    const store = PROGRAM_IDS.store
    if (!store) {
        throw new Error('Store not initialized')
    }

    const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault)

    const value = new StartAuctionArgs()
    const data = Buffer.from(serialize(SCHEMA, value))

    const keys = [
        {
            pubkey: toPublicKey(auctionManagerKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(auctionKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(auctionManagerAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: store,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(PROGRAM_IDS.auction),
            isSigner: false,
            isWritable: false,
        },

        {
            pubkey: SYSVAR_CLOCK_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ]

    return new TransactionInstruction({
        keys,
        programId: toPublicKey(PROGRAM_IDS.metaplex),
        data,
    })
}

export async function validateSafetyDepositBoxV2(
    vault: StringPublicKey,
    metadata: StringPublicKey,
    safetyDepositBox: StringPublicKey,
    safetyDepositTokenStore: StringPublicKey,
    tokenMint: StringPublicKey,
    auctionManagerAuthority: StringPublicKey,
    metadataAuthority: StringPublicKey,
    payer: StringPublicKey,
    edition: StringPublicKey,
    whitelistedCreator: StringPublicKey | undefined,
    store: StringPublicKey,
    safetyDepositConfig: SafetyDepositConfig
): Promise<TransactionInstruction> {
    const PROGRAM_IDS = programIds()

    const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault)

    const originalAuthorityLookup = await getOriginalAuthority(auctionKey, metadata)

    const safetyDepositConfigKey = await getSafetyDepositConfig(auctionManagerKey, safetyDepositBox)

    const tokenTracker = await getAuctionWinnerTokenTypeTracker(auctionManagerKey)

    const value = new ValidateSafetyDepositBoxV2Args(safetyDepositConfig)
    const data = Buffer.from(serialize(SCHEMA, value))

    const keys = [
        {
            pubkey: toPublicKey(safetyDepositConfigKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(tokenTracker),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(auctionManagerKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(metadata),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(originalAuthorityLookup),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(whitelistedCreator || SystemProgram.programId),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(store),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(safetyDepositBox),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(safetyDepositTokenStore),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(tokenMint),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(edition),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(vault),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(auctionManagerAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(metadataAuthority),
            isSigner: true,
            isWritable: false,
        },

        {
            pubkey: toPublicKey(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(PROGRAM_IDS.metadata),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ]

    return new TransactionInstruction({
        keys,
        programId: toPublicKey(PROGRAM_IDS.metaplex),
        data,
    })
}


