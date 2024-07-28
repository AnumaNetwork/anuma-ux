import {html, css, FlowFormat, i18n, T} from './anuma-wallet-ui.js';
import {AnumaWalletMobile} from './anuma-wallet-mobile.js';

export class AnumaWalletDesktop extends AnumaWalletMobile{

	static get properties() {
		return {
		};
	}

	static get styles(){
		return [AnumaWalletMobile.styles, css`
			:host{overflow:hidden}
			.container{
				padding:var(--anuma-wallet-container-padding, 15px);
				position:relative;flex:1;overflow:auto
			}
			:host([locked]) .container{
				overflow:hidden;
			}
			.wallet-warning{
				max-width:640px;margin:5px auto;padding:10px;text-align:center;
				background-color:var(--anuma-wallet-warning-bg, #fdf8e4);
			}
			.heading{margin:5px 15px 25px;font-size:1.5rem;}
			flow-btn{vertical-align:bottom;margin:5px;}
			.error-message{color:#F00;margin:10px 0px;}
			[hidden]{display:none}
			.h-box{display:flex;align-items:center}
			.h-box .label{min-width:100px}
			.top-line{
				border-top:1px solid var(--flow-primary-color);
				padding-top:5px;margin-top:10px
			}
			.flex{flex:1}
			.body{display:flex;align-items:top;flex-wrap:wrap;justify-content:center}
			.left-area{
				flex:4;margin:0px 20px 40px;max-width:600px;
			}
			.right-area{
				flex:6;margin-left:20px;margin-right:20px;max-width:750px;
				height:var(--anuma-wallet-right-area-height, calc(100vh - 122px));
				display:flex;flex-direction:column;
				min-width:600px;
			}
			.divider{flex:1;}
			@media (max-width:950px){
				.left-area,
				.right-area{margin:auto;min-width:100%}
				.divider{min-width:100%;height:100px}
			}
			[txout] .amount{color:red}
			.buttons{margin:20px 0px;}
			/*.balances .value{text-align:right}
			.balances .balance{display:flex;justify-content: space-between;}*/
			.loading-img{width:20px;height:20px;vertical-align:text-top;}

			.balance-badge{
				display:flex;flex-direction:column;padding:10px 0px;
				border-radius:10px;max-width:100%;
			}
			.balance{display:flex;flex-direction:column;padding:5px;}
       		.value{font-family: "Exo 2"; font-size: 36px; margin-top: 4px;}
		 	.value-pending{
		 		font-family : "Exo 2"; font-size: 20px; margin-top: 4px;
		 	} 
			.label { font-family : "Open Sans"; font-size: 20px; }
			.label-pending { font-family : "Open Sans"; font-size: 14px; }
			[row]{display:flex;flex-direction:row;justify-content:space-between;}
			flow-qrcode{width:172px;margin-top:50px;box-shadow:var(--flow-box-shadow);}
			.address-badge{padding:15px 0px;}
			.address-input{height:40px;max-width:460px}
			.qr-code-holder{
				display:flex;align-items:flex-end;justify-content:space-between;
				max-height:200px;margin-bottom:32px;
			}
			.buttons-holder {display:flex;}
			.status{display:flex;margin-top:10px;}
			.tx-open-btn{
				margin:0px 10px;padding:5px;
				border-radius:var(--flow-dropdown-trigger-border-radius, 3px);
				cursor:pointer;
			}
			.tx-open-btn:hover{background-color:var(--flow-primary-color);}
			flow-dropdown.icon-trigger{
				--flow-dropdown-trigger-bg:transparent;
				--flow-dropdown-trigger-padding:5px;
				--flow-dropdown-trigger-width:auto;
			}
			.top-menu{
				display:flex;align-items:center;
				position:var(--anuma-wallet-top-menu-position, absolute);
				right:var(--anuma-wallet-top-menu-right, 20px);
				top:var(--anuma-wallet-top-menu-top, -4px);
				z-index:2;
				background-color:var(--flow-background-color, #FFF);
			}
			fa-icon.md{--fa-icon-size:24px}
			.recent-transactions .heading{
				text-align:left;
				font-size:initial;
				margin:5px 0px 10px;
			}
			.tabs-container{border-top:0px;}
			.header{
				border-bottom:var(--anuma-wallet-header-border-bottom, --2px solid var(--anuma-wallet-tab-border-top-color, var(--flow-primary-color)));
			}
		`];
	}
	constructor() {
		super();
		this.selectedTab = "transactions";
		this.showBalanceTab = false;
		this.recentTransactionsHeading = i18n.t("Transactions under process");
		this.updateTXLimit();
		this.addEventListener("new-wallet", ()=>{
			this.updateTXLimit();
		})
	}
	updateTXLimit(){
		let height = this.getBoundingClientRect().height - 10;
		let h = Math.max(500, height);
		if(this.parentNode && this.parentNode.getBoundingClientRect){
			height = this.parentNode.getBoundingClientRect().height - 10;
			h = Math.max(h, height);
		}
		this.txLimit = Math.floor( h / 72);
	}
	connectedCallback(){
		super.connectedCallback();
		this.updateTXLimit();
	}
	render(){
		return html`
			${this.renderHeaderBar(true)}
			<div class="container">
				<div class="body">
					<div class="left-area">
						<div class="error-message" 
							?hidden=${!this.errorMessage}>${this.errorMessage}</div>
						${this.renderBalance()}
						${this.renderAddress()}
						${this.renderQRAndSendBtn()}
					</div>
					<div class="right-area">
						${super.render()}
					</div>
				</div>
			</div>
		`
	}
	renderHeaderBar(isDesktop=false){
		if(isDesktop)
			return super.renderHeaderBar();
		return '';
	}
	renderAllTX(){
		return html`
		${this.renderTxNotifications()}
		${super.renderAllTX()}`
	}
	renderTxNotifications(){
		let notifications = [...this.preparingTxNotifications.values()];
		if(!notifications.length)
			return '';

		return html`<div class="tx-notifications">
				${notifications.map(n=>{
					return html`<div class="tx-notification">
						${n.compoundUTXOs?
							html`${T('Compounding UTXOs...')}`:
							i18n.t(`Preparing transaction for [n] ANUM ....`)
								.replace('[n]', this.formatANUM(n.amount))}
					</div>`
				})}
			</div>`;
	}
	renderAddress(){
		if(!this.wallet)
			return '';

		return html`
		<div class="address-badge">
			<div is="i18n-div">Receive Address:</div>
			<div class="address-holder">
				<textarea class="address-input" readonly
					@click="${()=>this.openAddressExplorer(this.receiveAddress||"")}"
					.value="${this.receiveAddress||''}"></textarea>
				<fa-icon ?hidden=${!this.receiveAddress} class="copy-address"
					@click="${this.copyAddress}"
					title="${T('Copy to clipboard')}" icon="copy"></fa-icon>
			</div>
		</div>`
	}
	renderBalance(){
		if(!this.wallet || !this.wallet.balance)
			return html``;

		const { balance : { available, pending } } = this.wallet;
		return html`
  			<div class="balance-badge">
                <div class="balance">
                    <span class="label" is="i18n-span">Available</span>
                    <span class="value">${this.formatANUM(available)} ANUM</span>
                </div>
                <div class="balance pending">
                    <span class="label-pending" is="i18n-span">Pending</span>
                    <span class="value-pending">${this.formatANUM(pending)} ANUM</span>
                </div>
            </div>
		`;
	}
	renderQRAndSendBtn(){
		if(!this.wallet)
			return '';
		return html`
			<div class="qr-code-holder">
				<flow-qrcode data="${this.receiveAddress||""}" ntype="6"></flow-qrcode>
				<div class="buttons-holder">
					<flow-btn primary @click="${this.showSendDialog}" i18n>SEND</flow-btn>
					<div style="flex:1;width:20px;"></div>
					<flow-btn primary ?hidden=${this.hideQRScanner}
						@click="${this.showSendDialogWithQrScanner}" i18n>Scan QR code</flow-btn>
				</div>
			</div>
			<div class="status">
				${T('Wallet Status:')} ${this.status||T('Offline')}<br/>
				${
					this.blockCount == 1 ?
					html`${T('DAG headers:')} ${this.headerCount?FlowFormat.commas(this.headerCount):''}` :
					html`${T('DAA score:')} ${this.blueScore?FlowFormat.commas(this.blueScore):''}`
				}
				
			</div>
		`
	}
	initWallet(encryptedMnemonic){
		if(encryptedMnemonic){
			showWalletInitDialog({
				mode:"open",
				wallet:this,
				hideable:false
			}, (err, info)=>{
				info.encryptedMnemonic = encryptedMnemonic;
				this.handleInitDialogCallback(info)
			})
		}else{
			showWalletInitDialog({
				mode:"init",
				wallet:this,
				hideable:false,
				isFresh:true
			}, (err, info)=>{
				this.handleInitDialogCallback(info)
			})
		}
	}
}
