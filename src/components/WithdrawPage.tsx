import React, { Component } from 'react';
import { generateProof, parseNote } from '../utils/snarks-functions';
import { DEMO_PRIVATE_KEY, NETWORK, TORNADO_PBTC_INSTANCES_ADDRESSES } from '../config';
import { tornadoABI } from '../contracts/tornadoABI';
import Spinner from './Spinner';


interface WithdrawPageState {
    noteWithdraw: string;
    btcAddress: string;
    loading: boolean;
    proofGenerated: boolean;
    txSent: boolean;
}

interface WithdrawPageProps {
    web3: any;
}

class WithdrawPage extends Component<WithdrawPageProps, WithdrawPageState> {
    constructor(props: any) {
        super(props);

        this.state = {
            noteWithdraw: '',
            btcAddress: '',
            loading: false,
            proofGenerated: false,
            txSent: false
        };
    }

    handleChange = (event: any) => {
        // Handle change of input fields
        switch (event.target.name) {

            case 'btcRecipientAddress':
                this.setState({ btcAddress: event.target.value, txSent: false });
                break;
            case 'note':
                this.setState({ noteWithdraw: event.target.value, txSent: false });
                break;
            default:
                break;
        }
    };

    /**
     * Do an ETH withdrawal
     */
    withdrawHandler = async () => {
        this.setState({ loading: true, txSent: false })
        try {
            const refund: string = '0';
            const recipient = this.state.btcAddress;
            const web3 = this.props.web3;
            const { amount, deposit } = parseNote(this.state.noteWithdraw);

            const tornadoAddress =
                TORNADO_PBTC_INSTANCES_ADDRESSES[NETWORK][amount];

            const tornado = new web3.eth.Contract(
                tornadoABI,
                tornadoAddress
            );

            const { proof, args } = await generateProof({ deposit, recipient, refund, tornado })
            args[2] = recipient;

            this.setState({ proofGenerated: true })


            // private key for demo purposes only
            const senderPrivateKey = DEMO_PRIVATE_KEY;
            const accountSender = web3.eth.accounts.privateKeyToAccount(senderPrivateKey);

            const nonce = await web3.eth.getTransactionCount(accountSender.address);
            const txData = await tornado.methods.withdraw(proof, ...args).encodeABI();

            // sing the transaction with user's private key
            const txSigned = await web3.eth.accounts.signTransaction(
                {
                    nonce: nonce,
                    to: tornadoAddress,
                    value: refund.toString(),
                    data: txData,
                    gasPrice: web3.utils.toHex(await web3.eth.getGasPrice()),
                    gas: web3.utils.toHex(1e6),
                },
                '0x' + senderPrivateKey
            )

            console.log('Submitting withdraw transaction')

            await web3.eth.sendSignedTransaction(txSigned.rawTransaction);

        } catch (e) {
            console.log('transaction not sent')
        }

        this.setState({ loading: false, proofGenerated: false, txSent: true, noteWithdraw: '' })
    }


    render() {

        let loadingInfo = <></>;
        let proofGenerated = <></>;
        let sendingTx = <></>;
        let txSent = <></>

        let withdrawButton = (
            <button className='hover-button withdraw-button' onClick={this.withdrawHandler}>Withdraw</button>
        );

        if (this.state.loading) {
            withdrawButton = <Spinner></Spinner>
            loadingInfo = <div>1. Generating proof...</div>
            if (this.state.proofGenerated) {
                sendingTx = <p>2. Sending transaction...</p>
            }
        }

        if (this.state.txSent) {
            txSent = <p className='successful-withdrawal'>
                Everything OK!
                <span style={{
                    color: '#666',
                    fontWeight: 'normal',
                    display: 'block',
                    fontSize: '16px',
                    margin: '30px auto 0 auto',
                    lineHeight: '25px',
                }}>Bitcoins will arrive soon to: <br /> <b>{this.state.btcAddress}</b></span></p>
        }


        return <div className='withdraw-wrapper'>
            <label className='withdraw-note-label'>
                <b>Your Note:</b>
                <input
                    name="note"
                    type="text"
                    value={this.state.noteWithdraw}
                    onChange={this.handleChange}
                />
            </label>
            <br />
            <label className='btc-recipient-label'>
                <b>Recipient's Bitcoin Address:</b>
                <input
                    name="btcRecipientAddress"
                    type="text"
                    value={this.state.btcAddress}
                    onChange={this.handleChange}
                />
            </label>
            <div className='withdrawal-info'>
                {withdrawButton}
                {loadingInfo}
                {proofGenerated}
                {sendingTx}
                {txSent}
            </div>
        </div>;
    }

}

export default WithdrawPage;
