#Dylan Xu, Mx. Martin, M545c, Due 14 December 2020
#Final Project
#A "competitive clicking" website where users make accounts to keep track of their total clicks,
#can interact with the clicking page and can view other players' total clicks

from flask import Flask, render_template, request, redirect, url_for, session
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
import json
import random

app = Flask(__name__) #presets for SQL server connection
app.config['MYSQL_HOST'] = 'mysql.2021.lakeside-cs.org'
app.config['MYSQL_USER'] = 'student2021'
app.config['MYSQL_PASSWORD'] = 'm545CS42021'
app.config['MYSQL_DB'] = '2021playground'
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'
mysql = MySQL(app)
app.config['TEMPLATES_AUTO_RELOAD'] = True #added so that edits to source code appear after force refresh
app.config['SECRET_KEY'] = 'verysecretkeysdluighfnqwodkeongj'

#name for leaderboard database
LEAD_DATABASE = "dylanxu_leaderboard"

#name for login information database
LOGIN_DATABASE = "dylanxu_login"
#session variable on servers
SESSION_VAR = "dylanxu_login"

#name for game ID
ID_DATABASE = "dylanxu_gameids"
#current game number
LOBBY_NUMBER = 0


#Returns the base page with the questionaire
@app.route('/')
def index():
	if SESSION_VAR in session:
		return redirect(url_for('homepage'))
	return render_template('index.html', failedLogin=False)

#Allows user to create an account
@app.route('/signup', methods=['GET','POST'])
def signup():
	if request.method == 'GET':
		return render_template('signup.html', usernameTaken=False)
	else: #only activated when user submits signup information
		username = request.form.get('username')
		#check if username is unique
		cursor = mysql.connection.cursor()
		query = 'SELECT username FROM ' + LOGIN_DATABASE + ' WHERE username=%s'
		queryVars = (username,)
		cursor.execute(query, queryVars)
		if len(cursor.fetchall()) != 0: #if this username exists in database
			return render_template('signup.html', usernameTaken=True)
		
		password = request.form.get('password')
		secured = generate_password_hash(password)
		
		#insert into database
		query = 'INSERT INTO ' + LOGIN_DATABASE + ' VALUES (%s, %s)'
		queryVars = (username,secured,)
		cursor.execute(query, queryVars)
		mysql.connection.commit()
		return redirect(url_for('index')) #back to homepage


#Allows user to login to their account and stay logged in for some time
@app.route('/login', methods=['GET', 'POST'])
def login():
	if request.method == 'GET':
		return render_template('index.html', failedLogin=True)
	else:
		#get user inputted data
		username = request.form.get('username')
		password = request.form.get('password')
		
		#establish connection
		cursor = mysql.connection.cursor()
		query = 'SELECT password FROM ' + LOGIN_DATABASE + ' WHERE username=%s'
		queryVars = (username,)
		cursor.execute(query, queryVars)
		mysql.connection.commit()
		results = cursor.fetchall()
		
		
		#check password
		if len(results) == 1: #one password given for this username
			checkPass = results[0]['password'] #calls 'password' key from tuple
			if check_password_hash(checkPass, password):
				session[SESSION_VAR] = username
				return redirect(url_for('homepage')) #user's homepage
			else:
				return redirect(url_for('login', error=True))
		else:
			return redirect(url_for('login', error=True))
			
#Logs out 
@app.route('/logout', methods=['POST'])
def logout():
	session.pop(SESSION_VAR, None)
	return redirect(url_for('index'))
	
#user's homepage
@app.route('/homepage')
def homepage():
	#print("Session: " + session[SESSION_VAR]) #tests if exists or is blank
	if not (SESSION_VAR in session): #checks if user is logged in; else, redirects to login page
		return redirect(url_for('index'))
		
	return render_template('homepage.html', username=session[SESSION_VAR])

#updates clicker counter -- DEPRECIATED
@app.route('/changeClicks', methods=['POST'])
def changeClicks():
	cursor = mysql.connection.cursor()
	query = 'UPDATE ' + LEAD_DATABASE + ' SET Total_Clicks = Total_Clicks + 1 WHERE Username=%s'
	queryVars = (session[SESSION_VAR],)
	cursor.execute(query, queryVars)
	mysql.connection.commit()
	
	query = 'SELECT Total_Clicks FROM ' + LEAD_DATABASE + ' WHERE Username=%s'
	queryVars = (session[SESSION_VAR],)
	cursor.execute(query, queryVars)
	mysql.connection.commit()
	return str(cursor.fetchall()[0]['Total_Clicks'])


@app.route('/enterGame', methods=['POST', 'GET'])
def enterGame():
	return redirect(url_for('homepage'))
	
@app.route('/lobby', methods=['POST'])
def lobby():
	run = True
	while run:
		id = random.randint(10 ** 8, 10 ** 9)
		hasID = getQuery('SELECT * FROM ' + ID_DATABASE + ' WHERE used_ids=%s', (id,))
		if len(hasID) == 0:
			run = False
			setQuery('INSERT INTO ' + ID_DATABASE + ' VALUES (%s)', (id,))
	global LOBBY_NUMBER
	LOBBY_NUMBER = id
	return render_template('lobby.html', gameID=id)

@app.route('/endGame', methods=['POST'])
def endGame():
	id = LOBBY_NUMBER
	print(id)
	setQuery = ('DELETE FROM ' + ID_DATABASE + 'WHERE used_ids=%s', (id,))
	return redirect(url_for('homepage'))

def getQuery(query, queryVars):
	cursor = mysql.connection.cursor()
	cursor.execute(query, queryVars)
	mysql.connection.commit()
	return cursor.fetchall()

def setQuery(query, queryVars):
	cursor = mysql.connection.cursor()
	cursor.execute(query, queryVars)
	mysql.connection.commit()

