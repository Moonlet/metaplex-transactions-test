import { SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js'
import BN from 'bn.js'
import { serialize } from 'borsh'
import { StringPublicKey, programIds, toPublicKey, VAULT_SCHEMA, InitVaultArgs, getSafetyDepositBox, AmountArgs, findProgramAddress, VAULT_PREFIX, NumberOfShareArgs, ExternalPriceAccount, UpdateExternalPriceAccountArgs } from '..'


export function setVaultAuthority(
    vault: StringPublicKey,
    currentAuthority: StringPublicKey,
    newAuthority: StringPublicKey
): TransactionInstruction {
    const vaultProgramId = programIds().vault

    const data = Buffer.from([10])

    const keys = [
        {
            pubkey: toPublicKey(vault),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(currentAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(newAuthority),
            isSigner: false,
            isWritable: false,
        },
    ]
    return new TransactionInstruction({
        keys,
        programId: toPublicKey(vaultProgramId),
        data: data,
    })
}

export function initVault(
    allowFurtherShareCreation: boolean,
    fractionalMint: StringPublicKey,
    redeemTreasury: StringPublicKey,
    fractionalTreasury: StringPublicKey,
    vault: StringPublicKey,
    vaultAuthority: StringPublicKey,
    pricingLookupAddress: StringPublicKey
): TransactionInstruction {
    const vaultProgramId = programIds().vault

    const data = Buffer.from(
        serialize(VAULT_SCHEMA, new InitVaultArgs({ allowFurtherShareCreation }))
    )

    const keys = [
        {
            pubkey: toPublicKey(fractionalMint),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(redeemTreasury),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(fractionalTreasury),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(vault),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(vaultAuthority),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(pricingLookupAddress),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: programIds().token,
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
        programId: toPublicKey(vaultProgramId),
        data: data,
    })
}

export async function addTokenToInactiveVault(
    amount: BN,
    tokenMint: StringPublicKey,
    tokenAccount: StringPublicKey,
    tokenStoreAccount: StringPublicKey,
    vault: StringPublicKey,
    vaultAuthority: StringPublicKey,
    payer: StringPublicKey,
    transferAuthority: StringPublicKey
): Promise<TransactionInstruction> {
    const vaultProgramId = programIds().vault

    const safetyDepositBox = await getSafetyDepositBox(vault, tokenMint)

    const value = new AmountArgs({
        instruction: 1,
        amount,
    })

    const data = Buffer.from(serialize(VAULT_SCHEMA, value))
    const keys = [
        {
            pubkey: toPublicKey(safetyDepositBox),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(tokenAccount),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(tokenStoreAccount),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(vault),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(vaultAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(transferAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: programIds().token,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
    ]
    return new TransactionInstruction({
        keys,
        programId: toPublicKey(vaultProgramId),
        data,
    })
}

export async function activateVault(
    numberOfShares: BN,
    vault: StringPublicKey,
    fractionMint: StringPublicKey,
    fractionTreasury: StringPublicKey,
    vaultAuthority: StringPublicKey
): Promise<TransactionInstruction> {
    const vaultProgramId = programIds().vault

    const fractionMintAuthority = (
        await findProgramAddress(
            [
                Buffer.from(VAULT_PREFIX),
                toPublicKey(vaultProgramId).toBuffer(),
                toPublicKey(vault).toBuffer(),
            ],
            toPublicKey(vaultProgramId)
        )
    )[0]

    const value = new NumberOfShareArgs({ instruction: 2, numberOfShares })
    const data = Buffer.from(serialize(VAULT_SCHEMA, value))

    const keys = [
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
            pubkey: toPublicKey(fractionTreasury),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(fractionMintAuthority),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(vaultAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: programIds().token,
            isSigner: false,
            isWritable: false,
        },
    ]
    return new TransactionInstruction({
        keys,
        programId: toPublicKey(vaultProgramId),
        data,
    })
}

export async function combineVault(
    vault: StringPublicKey,
    outstandingShareTokenAccount: StringPublicKey,
    payingTokenAccount: StringPublicKey,
    fractionMint: StringPublicKey,
    fractionTreasury: StringPublicKey,
    redeemTreasury: StringPublicKey,
    newVaultAuthority: StringPublicKey | undefined,
    vaultAuthority: StringPublicKey,
    transferAuthority: StringPublicKey,
    externalPriceAccount: StringPublicKey
): Promise<TransactionInstruction> {
    const vaultProgramId = programIds().vault

    const burnAuthority = (
        await findProgramAddress(
            [
                Buffer.from(VAULT_PREFIX),
                toPublicKey(vaultProgramId).toBuffer(),
                toPublicKey(vault).toBuffer(),
            ],
            toPublicKey(vaultProgramId)
        )
    )[0]

    const data = Buffer.from([3])

    const keys = [
        {
            pubkey: toPublicKey(vault),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(outstandingShareTokenAccount),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(payingTokenAccount),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(fractionMint),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(fractionTreasury),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(redeemTreasury),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: toPublicKey(newVaultAuthority || vaultAuthority),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(vaultAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(transferAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(burnAuthority),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: toPublicKey(externalPriceAccount),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: programIds().token,
            isSigner: false,
            isWritable: false,
        },
    ]
    return new TransactionInstruction({
        keys,
        programId: toPublicKey(vaultProgramId),
        data,
    })
}

export function updateExternalPriceAccount(
    externalPriceAccountKey: StringPublicKey,
    externalPriceAccount: ExternalPriceAccount
): TransactionInstruction {
    const vaultProgramId = programIds().vault

    const value = new UpdateExternalPriceAccountArgs({ externalPriceAccount })
    const data = Buffer.from(serialize(VAULT_SCHEMA, value))

    const keys = [
        {
            pubkey: toPublicKey(externalPriceAccountKey),
            isSigner: false,
            isWritable: true,
        },
    ]
    return new TransactionInstruction({
        keys,
        programId: toPublicKey(vaultProgramId),
        data,
    })
}
