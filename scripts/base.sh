# BaseConfig(){
#   AppName="ChatGPT-Next-Web"
#   UserDir="/home/gaogao"
#   DirName=$AppName
#   CompressedAppName="$AppName.tar.gz"
#   CompressedAppBuildName="NextJSBuild.tar.gz"
#   TargetHost="gaogao@QQ.shanghai"
#   IdRsaPath="~/.ssh/id_rsa"
#   ParentDir="$UserDir/ChatGPTWebUI-BETA"
#   # stage=${1:-"gaogao"}
#   stage="gaogao"
#   echo "Ready to deploy stage: $stage"
#   SrcDir="$ParentDir/$DirName"
#   port=22
# }

# stel
BaseConfig() {
	AppName="ChatGPT-Next-Web"
	UserDir="/home/stel"
	DirName=$AppName
	CompressedAppName="$AppName.tar.gz"
	CompressedAppBuildName="NextJSBuild.tar.gz"
	TargetHost="stel@AIGPT"
	IdRsaPath="~/.ssh/id_rsa"
	ParentDir="$UserDir/AIGPT"
	SrcDir="$ParentDir/$DirName"
	envFile=".env.stel"
	stage="stel"
	echo "Ready to deploy stage: $stage"
	port=22
}

# kksclub
# BaseConfig() {
# 	AppName="ChatGPT-Next-Web"
# 	DirName=$AppName
# 	CompressedAppName="$AppName.tar.gz"
# 	CompressedAppBuildName="NextJSBuild.tar.gz"
# 	UserDir="/root"
# 	TargetHost="root@kks"
# 	IdRsaPath="~/.ssh/id_rsa"
# 	ParentDir="$UserDir/AIGPT"
# 	dump_database="$UserDir/dump_sql"
# 	stage="kks"
# 	envFile=".env.kks"
# 	echo "Ready to deploy stage: $stage"
# 	SrcDir="$ParentDir/$DirName"
# 	port=27853
# }

BaseConfig
