import {
	html, css, AnumaDialog, T, ANUM,
	formatForMachine, formatForHuman
} from './anuma-dialog.js';

class AnumaReceiveDialogMobile extends AnumaDialog{
	static get properties(){
		return {
			address:{type:String},
			amount:{type:String}
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
				width:90%;max-width:450px;margin:auto;
				display:flex;flex-wrap:wrap;flex-direction:column;
				justify-content:center; align-items:center;
			}
			label{font-size:0.9rem;margin:5px;display:block}
			.address-option-btns flow-btn{flex:1;max-width:120px;min-width:120px;margin:5px}
			.buttons{justify-content:flex-end;align-items:center}
			.spinner{margin-right:20px}
			.estimate-tx-error{color:red}
			.estimate-tx span{display:block}	
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
	renderHeading(){
		return html`${this.renderBackBtn()} RECEIVE`;
	}
	renderBody(){
		let {amount='', address=''} = this;
		let amountStr = amount?'?amount='+amount:'';
		return html`
			<flow-qrcode data="${address+amountStr}" ntype="6"></flow-qrcode>
			<flow-input class="address full-width" suffix-btn
				label="${T('Request URL')}" readonly value="${address+amountStr}">
				<flow-btn slot="suffix" class="primary"
					@click="${this.copyAddress}" icon="copy"></flow-btn>
			</flow-input>
			<flow-input class="amount full-width" suffix-btn
				label="${T('Amount in ANUM')}" @keyup=${this.onAmountChange}
				value="${this.amount}">
				<flow-btn slot="suffix" class="primary"
					@click="${this.showT9}" icon="keyboard"></flow-btn>
			</flow-input>
			<div class="error">${this.errorMessage}</div>
			<flow-btn primary class="center-button"	@click="${this.hide}">
				DONE
			</flow-btn>
			`;
	}
	open(args, callback){
		this.callback = callback;
		this.args = args;
		this.wallet = args.wallet;
		this.address = args.address||"";
		this.amount = args.amount||"";
		this.show();
	}
	copyAddress(){
		let input = this.renderRoot.querySelector(".address").renderRoot.querySelector("input");
		input.select();
		input.setSelectionRange(0, 99999)
		document.execCommand("copy");
		input.setSelectionRange(0,0)
		input.blur();
	}
	async copyFromClipboard(){
		const address = await navigator.clipboard.readText();
		this.setAmount(address)
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
			this.onAmountChange();
			dialog.hide();
		})
	}
    cancel(){
    	this.hide();
    }
    onAmountChange(){
    	this.updateQRCode();
    }
    updateQRCode(){
    	this.amount = this.qS(".amount").value;


    }
}

AnumaReceiveDialogMobile.define("anuma-receive-dialog-mobile");
