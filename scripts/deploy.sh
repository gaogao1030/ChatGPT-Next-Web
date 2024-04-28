source scripts/base.sh

before_build() {
  cp .env.local .env.prev
  cp $1 .env.local
}

rm_exist_file() {
  if [ -f $1 ]; then
    echo "remove $1"
    rm $1
  fi
}

after_build() {
  cp .env.prev .env.local
}

Done() {
  echo "Deploy done for stage: $1"
}

Compress() {
  local type=$1
  local cmd
  local showCMD
  local archive
  if test $type == "Build"; then
    archive=$CompressedAppBuildName
    cmd="tar -zcf $archive --exclude node_modules .next"
    showCMD='echo "Skip Show List"'
  else
    archive=$CompressedAppName
    cmd="tar -zcf $archive --exclude 'node_modules' --exclude '.env.*' --exclude '.next' *"
    #showCMD="tar -tvf $archive"
    showCMD='echo "Skip Show List"'
  fi
  echo "Ready to generate $archive"
  echo "$archive generating..."
  eval $cmd
  eval $showCMD
  echo "$archive generated"
}

rm_exist_file $CompressedAppName
rm_exist_file $CompressedAppBuildName

before_build $envFile

npm run build
wait
after_build

Compress "APP"
wait
Compress "Build"
wait

ssh -p $port -i $IdRsaPath $TargetHost "mkdir -p $ParentDir/$DirName"

scp -P $port -i $IdRsaPath ./$CompressedAppName $TargetHost:$ParentDir/$CompressedAppName
wait
scp -P $port -i $IdRsaPath ./$CompressedAppBuildName $TargetHost:$ParentDir/$CompressedAppBuildName
wait

ssh -p $port -i $IdRsaPath $TargetHost "cd $SrcDir; mv node_modules ../"
ssh -p $port -i $IdRsaPath $TargetHost "cd $ParentDir; rm -rf $DirName; mkdir $DirName"
ssh -p $port -i $IdRsaPath $TargetHost "cd $ParentDir; tar -xvf $CompressedAppName -C $SrcDir"
wait
ssh -p $port -i $IdRsaPath $TargetHost "cd $ParentDir; tar -xvf $CompressedAppBuildName -C $SrcDir"
wait
ssh -p $port -i $IdRsaPath $TargetHost "cd $SrcDir; mv ../node_modules ./"
wait
scp -P $port -i $IdRsaPath "./$envFile" "$TargetHost:$SrcDir/.env.local"
wait
ssh -p $port -i $IdRsaPath $TargetHost "cd $SrcDir; npm install; pm2 delete $AppName; pm2 start ecosystem.config.js"
wait

Done $stage
