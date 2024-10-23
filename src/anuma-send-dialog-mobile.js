import {
	html, css, AnumaDialog, askForPassword, ANUM,
	formatForMachine, T, i18n, formatForHuman, getLocalWallet
} from './anuma-dialog.js';
import {Wallet} from '@anuma-network/wallet-worker';
const pass = "";

class AnumaSendDialogMobile extends AnumaDialog{
	static get properties(){
		return {
			address:{type:String}
		}
	}
	static get styles(){
		return [AnumaDialog.styles, 
		css`
			.container{
				border-radius:0px;width:100%;height:100%;border:0px;
				padding:0px;max-height:none;
			}
			.address-option-btns{
				width:100%;margin:auto;
				display:flex;flex-wrap:nowrap;flex-direction:row;
				justify-content:center; align-items:center;
			}
			label{font-size:1.0rem;margin:5px;display:block}
			.address-option-btns flow-btn{flex:1;max-width:140px;min-width:140px;margin:5px}
			/*.address-option-btns flow-btn:nth-child(1) { margin-left:0px;}
			.address-option-btns flow-btn:nth-child(2) { margin-right:0px;}*/
			.buttons{justify-content:flex-end;align-items:center}
			.spinner{margin-right:20px}
			.estimate-tx-error{color:red; margin-top:6px;}
			/*.estimate-tx span{display:block}*/
			.estimate-tx table { font-size: 1.02rem;margin-top:8px}
			.estimate-tx table tr td { padding:3px; }
			.estimate-tx table tr td:nth-child(2) { min-width:150px; }
	
			flow-checkbox{width:100%;margin:15px 0px;}
			[col] { display:flex; flex-direction: row;flex-wrap:wrap }
			[spacer] { min-width: 32px; }
			[flex] { flex:1; }
			flow-input{min-width:100px;}
			flow-input.amount,
			flow-input.fee{flex:1}
			flow-checkbox{margin:8px 0px;}
			.body-box{align-items:flex-start;}
			.center-button{
				margin:5px auto;display:block;max-width:120px;
			}
			@media (max-width:400px){
				[spacer] { min-width: 100%; }
			}
		`]
	}
	buildRenderArgs(){
		const estimating = this.estimateTxSignal && !this.estimateTxSignal.isResolved;
		const estimateFee = this.estimate?.fee;
		return {estimating, estimateFee};
	}
	renderHeading({estimating}){
		return html`${this.renderBackBtn()} SEND 
			<div class="flex"></div>
			${estimating?html`<fa-icon class="spinner" icon="sync"
				></fa-icon>`:''}`;
	}
	renderBody({estimating, estimateFee}){
		return html`
			<center>
				<label is="i18n-label">Enter recipient address</label>
			</center>
			<div class="address-option-btns">
				<flow-btn @click="${this.scanQRCode}"
					class="primary" i18n>Scan QR Code</flow-btn>
				<flow-btn @click="${this.copyFromClipboard}"
					class="primary" i18n>Clipboard</flow-btn>
				<!-- flow-btn @click="${this.showAddressInputField}" 
					class="primary">Manual Entry</flow-btn -->
			</div>
			${this.renderAddress()}
			<flow-input class="amount full-width" suffix-btn outer-border
				label="${T('Amount in ANUM')}" @keyup=${this.onAmountChange}>
				<flow-btn slot="suffix" class="primary"
					@click="${this.showT9}"><fa-icon icon="keyboard"></fa-icon></flow-btn>
			</flow-input>
			<flow-input class="fee full-width" suffix-btn outer-border
				label="${T('Priority Fee in ANUM')}"
				@keyup="${this.onNetworkFeeChange}">
				<flow-btn slot="suffix" class="primary"
					@click="${this.showT9}"><fa-icon icon="keyboard"></fa-icon></flow-btn>
			</flow-input>
			<flow-input class="note full-width" outer-border label="Note"></flow-input>
			<flow-checkbox class="calculate-network-fee" checked
				@changed="${this.onCalculateFeeChange}">${T('Automatically calculate network fee')}</flow-checkbox>
			<!--flow-input class="maximum-fee full-width" label="Maximum network fee"></flow-input-->
			<flow-checkbox class="inclusive-fee"
				@changed="${this.onInclusiveFeeChange}">${T('Include fee in the amount')}</flow-checkbox>
			${this.renderEstimate()}
			<div class="error">${this.errorMessage}</div>
			<flow-btn primary class="center-button"
				?disabled=${estimating || !this.estimateTxSignal || !estimateFee}
				@click="${this.sendAfterConfirming}" i18n>SEND
			</flow-btn>
			`;
	}
	renderAddress(){
		let address = this.address;
		return html `
			<flow-input class="address full-width" clear-btn outer-border
				label="${T('Address')}" _readonly placeholder=""
				value="${address}"
				@changed="${this.onAddressChange}">
			</flow-input>
		`
	}
	
	renderEstimate(){
		if(this.estimateError)
			return html`<div class="estimate-tx-error">${this.estimateError}</div>`;
		let {dataFee, fee, totalAmount, txSize} = this.estimate||{}

		return html`
		<div class="estimate-tx">
			<table>
				${txSize?html`<tr><td is="i18n-td">Transaction Size</td><td>${txSize.toFileSize()}</td></tr>`:''}
				${dataFee?html`<tr><td is="i18n-td">Data Fee</td><td>${ANUM(dataFee)} ANUM</td></tr>`:''}
				${fee?html`<tr><td is="i18n-td">Total Fee</td><td>${ANUM(fee)} ANUM</td></tr>`:''}
				${totalAmount?html`<tr><td is="i18n-td">Total Amount</td><td> ${ANUM(totalAmount)} ANUM</td></tr>`:''}
			</table>
		</div>
		`
	}
	renderButtons(){
		return ''
	}
	open(args, callback){
		this.callback = callback;
		this.args = args;
		this.wallet = args.wallet;
		this.estimateError = "";
		this.estimate = {};
		this.alertFeeAmount = 1e8;
		this.address = args.address||"";
		if(args.amount){
			let amountField = this.qS(".amount");
			amountField.value = args.amount
		}
		this.show();
	}
	cleanUpForm(){
		this.estimateError = "";
		this.estimate = {};
		this.requestUpdate("estimate", null)
		this.qSAll("flow-input").forEach(input=>{
    		input.value = "";
		})
		this.qS(".inclusive-fee").checked = false;
		
	}
	scanQRCode(){
		this.wallet.showQRScanner({isAddressQuery:true}, ({amount, address})=>{
			console.log("scan result: amount, address", amount, address)
			if(amount){
				let amountField = this.qS(".amount");
				amountField.value = amount
			}

			this.setAddress(address)
		})
	}

	async copyFromClipboard(){
		const address = await navigator.clipboard.readText();
		this.setAddress(address)
	}
	async setAddress(address){
		if(!address){
			this.address = "";
			return
		}

		[address] = address.split("?");
		let valid = await this.wallet?.isValidAddress(address);
		if(!valid){
			this.setError("Invalid address")
			return
		}

		this.address = address;
	}
	onAddressChange(e){
		let {value} = e.detail;
		if(!value)
			this.address = value;

	}

	showT9(e){
		let input = e.target.closest("flow-input");
		let {value=''} = input;
		showT9({
			value,
			heading:input.label.replace("in ANUM", ""),
			inputLabel:input.label
		}, ({value, dialog})=>{
			console.log("t9 result", value)
			input.value = value;
			dialog.hide();
		})
	}
	hide(skipHistory=false){
		this.cleanUpForm();
		super.hide(skipHistory)
	}
    cancel(){
    	this.hide();
    }
    getFormData(){
    	let address = this.qS(".address").value;
    	let amount = this.qS(".amount").value;
    	let note = this.qS(".note").value;
    	let fee = this.qS(".fee").value || 0;
    	let calculateNetworkFee = !!this.qS(".calculate-network-fee").checked;
    	let inclusiveFee = !!this.qS(".inclusive-fee").checked;

    	return {
    		amount:formatForMachine(amount),
    		fee:formatForMachine(fee),
    		address, note, 
    		calculateNetworkFee,
    		inclusiveFee
    	};
    }
    onNetworkFeeChange(){
    	this.estimateTx();
    }
    onAmountChange(){
    	this.estimateTx();
    }
    onCalculateFeeChange(){
    	this.estimateTx();
    }
    onInclusiveFeeChange(){
    	this.estimateTx();
    }
    
	estimateTx(){
		this.debounce('estimateTx', ()=>{
			this.requestUpdate("estimateTx", null)
			let p = this._estimateTx();
			p.then(()=>{
				p.isResolved = true;
				this.requestUpdate("estimateTx", null)
			})

			this.estimateTxSignal = p;
		}, 300)
	}

	async _estimateTx(){
    	const formData = this.getFormData();
    	if(!formData)
    		return

    	console.log("formData:", formData)
    	let {error, data:estimate} = await this.wallet.estimateTx(formData);
    	console.log("estimateTx:error:", error, "estimate:", estimate)
    	this.estimateError = error;
    	if(estimate){
    		this.estimate = estimate;
    	}else{
    		this.estimate = {};
    	}
    }
    async sendAfterConfirming(){
    	let estimate = this.estimate;
    	if(!estimate)
    		return
    	if(estimate.fee > this.alertFeeAmount){
			let msg = i18n.t('Transaction Fee ([n] ANUM) is very large.');
			msg = msg.replace('[n]', ANUM(estimate.fee));
    		let {btn} = await FlowDialog.alert("Warning", 
    			html`${msg}`,
    			'',
    			[{
					text:i18n.t('Cancel'),
					value:'cancel'
				},{
					text:i18n.t('Submit'),
					value:'submit',
					cls:'primary'
				}]);

    		if(btn !='submit')
    			return
    	}
    	const formData = this.getFormData();
    	if(!formData)
    		return
    	console.log("formData", formData)
    	askForPassword({confirmBtnText:i18n.t("CONFIRM SEND"), pass}, async({btn, password})=>{
    		//console.log("btn, password", btn, password)
    		if(btn!="confirm")
    			return
			formData.password = password;

			let wallet = getLocalWallet();
    		let encryptedMnemonic = wallet.mnemonic;
    		let valid = await Wallet.checkPasswordValidity(password, encryptedMnemonic);
    		if(!valid)
    			return FlowDialog.alert(i18n.t("Error"), i18n.t("Invalid password"));


			this.hide();
			this.callback(formData);
    	})
    }
}

AnumaSendDialogMobile.define("anuma-send-dialog-mobile");
