import React from 'react'
import './index.css'

// import {navigate/*,Router,Link*/} from '@reach/router'
// import {gql} from 'apollo-boost'
import {answerQuestion as mutation_answerQuestion} from '../queries.js'

// import categories from '../data/dist/categories.json'
// import presets from '../data/dist/presets.json'
// import colors from '../data/dist/colors.json'
// import colorsByPreset from '../data/dist/colorsByPreset.json'
// import {getPreset, getColorByPreset} from '../functions.js'

import {
	Typography,
	Button,
	Fab,
	// Snackbar,

	// List,
	// ListItem,
	// ListItemIcon,
	// ListItemText,
	// ListSubheader,

	// Card,
	// CardContent,
	// Divider,
	// Chip,

	// Icon,

	// TextField,
} from '@material-ui/core'
import {
	// Map as MapIcon,
	// Link as LinkIcon,

	// Phone as PhoneIcon,
	// Print as PrintIcon,
	// Mail as MailIcon,

	// Facebook as FacebookIcon,
	// Instagram as InstagramIcon,
	// Twitter as TwitterIcon,
	// YouTube as YouTubeIcon,

	// Edit as EditIcon,
	Done as DoneIcon,
	ArrowForward as ArrowForwardIcon,
} from '@material-ui/icons'
// import {
// 	Autocomplete
// } from '@material-ui/lab'


const questions = [
	{
		_id: 'tag_wheelchair',
		properties: {
			question: 'Ist dieser Ort mit einem Rollstuhl erreichbar?',
			listAnswers: false,
			answers: {
				yes: {
					// icon: 'check',
					title: 'Ja',
					tag: {
						wheelchair:'yes',
					},
				},
				no: {
					// icon: 'clear',
					title: 'Nein',
					tag: {
						wheelchair:'no',
					},
				},
			},
		}
	},
	{
		_id: 'tag_toilets',
		properties: {
			question: 'Hat dieser Ort Toiletten?',
			answers: {
				yes: {
					title: 'Ja',
					tag: {
						'toilets':'yes',
					},
				},
				no: {
					title: 'Nein',
					tag: {
						'toilets':'no',
					},
				},
			},
		}
	}
]
const questionsById = questions.reduce((obj,questionDoc)=>{
	obj[questionDoc._id] = questionDoc
	return obj
}, {})
const questionIDs = Object.keys(questionsById)
console.log('questionsById', questionsById)


export default class Questions extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			answersByQuestionId: {},
			questionDoc: null,
		}

		this.setNextQuestionDoc = this.setNextQuestionDoc.bind(this)
		this.answerQuestion = this.answerQuestion.bind(this)
		this.finish = this.finish.bind(this)
	}

	componentDidMount(){
		this.setNextQuestionDoc()
	}
	componentDidUpdate(){
		this.setNextQuestionDoc()
	}

	finish(){
		if (this.props.onFinish) {
			this.props.onFinish()
		}
	}

	answerQuestion(questionDoc, answerValue){
		console.log(questionDoc, answerValue)

		window.graphql.mutate({
			mutation: mutation_answerQuestion,
			variables: {
				properties: {
					forID: this.props.doc._id,
					questionID: questionDoc._id,
					answer: answerValue,
				}
			}
		}).then(result=>{
			console.info('mutate-result', result)
		}).catch(error=>{
			console.error('mutate-error', error)
		})


		this.setState((state,props)=>{ // start this while mutating
			return {
				answersByQuestionId: {
					...state.answersByQuestionId,
					[questionDoc._id]: answerValue,
				},
			}
		})
	}

	setNextQuestionDoc(){
		const answeredQuestionIDs = Object.keys(this.state.answersByQuestionId)

		console.log('this.state.answersByQuestionId', this.state.answersByQuestionId)

		let nextQuestionDoc = null
		if (answeredQuestionIDs.length === 0) {
			nextQuestionDoc = questions[0]
		}else{
			const questionIDs_NotAsked = questionIDs.filter(id=>!answeredQuestionIDs.includes(id))
			console.log('questionIDs_NotAsked', questionIDs_NotAsked)
			
			if (questionIDs_NotAsked.length > 0) {
				nextQuestionDoc = questionsById[questionIDs_NotAsked[0]]
			}
		}

		
		this.setState((state,props)=>{
			if (nextQuestionDoc !== state.questionDoc) {
				return {questionDoc:nextQuestionDoc}
			}
			return null
		})
	}

	renderQuestion(questionDoc){
		// console.log('questionDoc', questionDoc)

		if (!(
			!!questionDoc &&
			!!questionDoc._id &&
			!!questionDoc.properties
		)) {
			return null
		}

			// answers: {
			// 	yes: {
			// 		title: 'Ja',
			// 		tag: {
			// 			wheelchair:'yes',
			// 		},
			// 	},
			// 	no: {
			// 		title: 'Nein',
			// 		tag: {
			// 			wheelchair:'no',
			// 		},
			// 	},
			// },

		const listAnswers = !!questionDoc.properties.listAnswers

		return (<React.Fragment key="question">
			<div style={{margin:'16px'}}>
				<Typography variant="h6">{questionDoc.properties.question}</Typography>

				<div style={{
					display: 'flex',
					alignItems: 'stretch',
					alignContent: 'stretch',
					justifyContent: 'space-between',
					margin: '24px -8px -8px -8px',
					flexDirection: (listAnswers ? 'column' : 'row'),
				}}>
					{Object.entries(questionDoc.properties.answers).map(pair=>{
						const answerKey = pair[0]
						const answer = pair[1]
						return (
							<Button
								key={answerKey}
								onClick={()=>this.answerQuestion(questionDoc,answerKey)}
								variant="outlined"
								size="large"
								style={{
									flexGrow: '1',
									border: 'none',
									boxShadow: 'inset 0 0 0 999px rgba(0,0,0,0.04)',
									color: 'inherit',
									margin: '4px 8px',
									padding: '16px 8px',
								}}
							>
								{
									!!answer.icon
									? (<div className="material-icons" style={{
										marginRight: '8px',
									}}>{answer.icon}</div>)
									: null
								}
								{answer.title}
							</Button>
						)
					})}
				</div>

				<div style={{
					margin: '32px -16px 0',
					padding:'0',
					display:'flex',
					// justifyContent: 'space-between',
					justifyContent: 'end',
				}}>
					{/*<Button
						variant="text"
						onClick={this.submit}
						size="large"
						style={{
							color: 'black',
							background: 'white',
							borderRadius: '999px',
						}}
					>
						<DoneIcon style={{color:'black',marginRight:'8px'}}/> Fertig
					</Button>*/}

					<Button
						variant="text"
						onClick={()=>this.answerQuestion(questionDoc,'skipped')}
						size="large"
						style={{
							color: 'inherit',
							// background: 'black',
							borderRadius: '999px',
							padding: '8px 16px',
						}}
					>
						Überspringen <ArrowForwardIcon style={{color:'inherit',marginLeft:'8px'}}/>
					</Button>
				</div>
			</div>
		</React.Fragment>)
	}

	render() {
		const doc = this.props.doc

		if (!(
			!!doc &&
			!!doc._id &&
			!!doc.properties &&
			!!doc.properties.tags
		)) {
			return null
		}

		// const properties = doc.properties
		// const tags = properties.tags

		const questionDoc = this.state.questionDoc

		return (<>
			{
				!!questionDoc
				? this.renderQuestion(questionDoc)
				: (<div style={{textAlign:'center', margin:'16px'}}>
					<Typography variant="body1" style={{margin:'0 0 32px 0'}}>Du hast alle Fragen beantwortet!<br />Vielen Dank!!!</Typography>

					<Fab
						variant="extended"
						onClick={this.finish}
						size="large"
						style={{
							color: 'white',
							background: 'black',
							borderRadius: '999px',
							padding: '8px 16px',
						}}
					>
						<DoneIcon style={{color:'var(--light-green)',marginRight:'8px'}}/> Fertig
					</Fab>
				</div>)
			}
		</>)
	}
}